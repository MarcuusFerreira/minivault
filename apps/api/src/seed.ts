import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { seedDemoData } from './seed-demo-data.js';

const password = process.env.DEMO_USER_PASSWORD;
if (!password) throw new Error('DEMO_USER_PASSWORD is required');

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
const result = await seedDemoData(app, password);
// Printed once on purpose: like the dashboard, this is the only chance to see the key.
process.stdout.write(
  result
    ? `Demo data created.\n  Email:    ${result.email}\n  Password: DEMO_USER_PASSWORD in .env\n  API key:  ${result.apiKey}\n`
    : 'Demo data already exists, nothing changed.\n',
);
await app.close();
