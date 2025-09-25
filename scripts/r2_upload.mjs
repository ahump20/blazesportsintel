#!/usr/bin/env node
import { readdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';

const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('R2 env vars missing. See .env.example');
  process.exit(1);
}

async function getS3() {
  try {
    const aws = await import('@aws-sdk/client-s3');
    const S3C = aws['S3' + 'Client'];
    const PutCmd = aws['PutObject' + 'Command'];
    return { S3C, PutCmd };
  } catch (error) {
    console.error("Missing dependency '@aws-sdk/client-s3'. Install with: npm install @aws-sdk/client-s3");
    process.exit(1);
  }
}

async function* walk(dir) {
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const localDir = process.argv[2] || 'apps/web/.next/static';
const prefix = (process.argv[3] || '').replace(/^\/+|\/+$/g, '');

const run = async () => {
  const { S3C, PutCmd } = await getS3();
  const s3 = new S3C({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  for await (const file of walk(localDir)) {
    const key = [prefix, path.relative(localDir, file)].filter(Boolean).join('/');
    const Body = await readFile(file);
    const cmd = new PutCmd({
      Bucket: R2_BUCKET,
      Key: key,
      Body,
      ACL: 'private',
      CacheControl: 'public, max-age=31536000, immutable',
    });
    await s3.send(cmd);
    console.log('Uploaded', key);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
