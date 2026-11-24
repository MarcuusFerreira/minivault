import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { configureApp } from './configure-app.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  logger: new ConsoleLogger({ json: true, logLevels: ['log', 'warn', 'error', 'fatal'] }),
});
configureApp(app);
app.enableShutdownHooks();
await app.listen(app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true }), '0.0.0.0');
