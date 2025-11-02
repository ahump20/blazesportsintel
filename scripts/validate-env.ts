#!/usr/bin/env node
/**
 * Comprehensive environment variable validation script
 * Run this before deploying to ensure all required environment variables are set
 */

import * as fs from 'fs';
import * as path from 'path';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  default?: string;
  validator?: (value: string) => boolean;
}

const ENV_VARS: EnvVar[] = [
  // Node Environment
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Node environment (development, production, test)',
    validator: (v) => ['development', 'production', 'test'].includes(v),
  },

  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    validator: (v) => v.startsWith('postgresql://'),
  },
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis connection string for caching',
    default: 'redis://localhost:6379',
  },

  // API Configuration
  {
    name: 'API_PORT',
    required: false,
    description: 'API server port',
    default: '3000',
    validator: (v) => !isNaN(Number(v)) && Number(v) > 0 && Number(v) < 65536,
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret key for JWT token signing',
    validator: (v) => v.length >= 32,
  },
  {
    name: 'JWT_EXPIRES_IN',
    required: false,
    description: 'JWT token expiration time',
    default: '7d',
  },

  // CORS & Security
  {
    name: 'ALLOWED_ORIGINS',
    required: false,
    description: 'Comma-separated list of allowed CORS origins',
    default: 'http://localhost:5173,http://localhost:3000',
  },

  // Sentry (optional in development)
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
  },
];

class EnvValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  validate(): boolean {
    console.log('🔍 Validating environment variables...\n');

    ENV_VARS.forEach((envVar) => {
      this.validateVariable(envVar);
    });

    this.printResults();

    return this.errors.length === 0;
  }

  private validateVariable(envVar: EnvVar): void {
    const value = process.env[envVar.name];

    // Check if required variable is missing
    if (envVar.required && !value) {
      this.errors.push(
        `❌ ${envVar.name} is required but not set. ${envVar.description}`
      );
      return;
    }

    // Use default if not set
    if (!value && envVar.default) {
      this.warnings.push(
        `⚠️  ${envVar.name} not set, using default: ${envVar.default}`
      );
      return;
    }

    // Skip validation if not required and not set
    if (!value) {
      return;
    }

    // Run custom validator if provided
    if (envVar.validator && !envVar.validator(value)) {
      this.errors.push(
        `❌ ${envVar.name} has invalid value. ${envVar.description}`
      );
      return;
    }

    console.log(`✅ ${envVar.name}`);
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:\n');
      this.warnings.forEach((warning) => console.log(warning));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:\n');
      this.errors.forEach((error) => console.log(error));
      console.log('\n' + '='.repeat(60));
      console.log('\n💥 Environment validation FAILED!\n');
      process.exit(1);
    } else {
      console.log('\n✅ Environment validation PASSED!\n');
      console.log('='.repeat(60) + '\n');
    }
  }
}

// Additional checks for production environment
function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  console.log('🔍 Running production-specific checks...\n');

  const prodChecks = [
    {
      name: 'JWT_SECRET',
      check: () =>
        process.env.JWT_SECRET !== 'your-super-secret-jwt-key-change-this-in-production',
      error: 'JWT_SECRET is using default value in production!',
    },
    {
      name: 'SENTRY_DSN',
      check: () => !!process.env.SENTRY_DSN,
      error: 'SENTRY_DSN should be set in production for error tracking',
    },
    {
      name: 'DATABASE_URL',
      check: () =>
        !process.env.DATABASE_URL?.includes('localhost') &&
        !process.env.DATABASE_URL?.includes('127.0.0.1'),
      error: 'DATABASE_URL appears to be pointing to localhost in production',
    },
  ];

  const prodErrors: string[] = [];

  prodChecks.forEach((check) => {
    if (!check.check()) {
      prodErrors.push(`❌ ${check.error}`);
    } else {
      console.log(`✅ ${check.name} production check passed`);
    }
  });

  if (prodErrors.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('\n❌ PRODUCTION VALIDATION ERRORS:\n');
    prodErrors.forEach((error) => console.log(error));
    console.log('\n' + '='.repeat(60));
    process.exit(1);
  }

  console.log('\n✅ Production checks PASSED!\n');
}

// Run validation
const validator = new EnvValidator();
const isValid = validator.validate();

if (isValid) {
  validateProductionEnv();
}
