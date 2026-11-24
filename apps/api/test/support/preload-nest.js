// @nestjs/throttler is CommonJS and requires Nest's ES modules. Under Jest that only works
// once those modules are fully evaluated, so they are loaded before any test file.
await import('reflect-metadata');
await import('@nestjs/common');
await import('@nestjs/core');
