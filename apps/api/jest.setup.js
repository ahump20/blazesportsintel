// Jest setup file for API tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.API_PORT = '0'; // Use random port for testing
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for integration tests
jest.setTimeout(10000);
