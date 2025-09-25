#!/usr/bin/env node
const required = ["TIMEZONE", "SITE_URL"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}
console.log("Env looks good.");
