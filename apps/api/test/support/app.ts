import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service.js';

export interface TestApp {
  app: NestExpressApplication;
  http: Server;
  prisma: PrismaService;
  close(): Promise<void>;
}

export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
  controllers: Type[] = [],
): Promise<TestApp> {
  const module = await customize(Test.createTestingModule({ imports: [AppModule], controllers })).compile();
  const app = module.createNestApplication<NestExpressApplication>({ logger: ['error', 'warn', 'fatal'] });
  configureApp(app);
  await app.init();
  return { app, http: app.getHttpServer() as Server, prisma: app.get(PrismaService), close: () => app.close() };
}
