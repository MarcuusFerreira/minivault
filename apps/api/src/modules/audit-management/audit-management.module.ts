import { Module } from '@nestjs/common';
import { ID_GENERATOR } from '../../shared/application/id-generator.js';
import { ProjectManagementModule } from '../project-management/project-management.module.js';
import { LIST_AUDIT_LOGS } from './application/ports/input/list-audit-logs.port.js';
import { RECORD_AUDIT_EVENT } from './application/ports/input/record-audit-event.port.js';
import { OWNED_PROJECTS } from './application/ports/output/owned-projects.port.js';
import { ListAuditLogsUseCase } from './application/use-cases/list-audit-logs/list-audit-logs.use-case.js';
import { RecordAuditEventUseCase } from './application/use-cases/record-audit-event/record-audit-event.use-case.js';
import { AUDIT_REPOSITORY } from './domain/repositories/audit.repository.js';
import { AuditSubscriber } from './infrastructure/adapters/input/events/audit.subscriber.js';
import { AuditLogsController } from './infrastructure/adapters/input/http/audit-logs.controller.js';
import { PrismaAuditRepository } from './infrastructure/adapters/output/persistence/prisma-audit.repository.js';
import { OwnedProjectsAdapter } from './infrastructure/adapters/output/projects/owned-projects.adapter.js';

@Module({
  imports: [ProjectManagementModule],
  controllers: [AuditLogsController],
  providers: [
    AuditSubscriber,
    { provide: AUDIT_REPOSITORY, useClass: PrismaAuditRepository },
    { provide: OWNED_PROJECTS, useClass: OwnedProjectsAdapter },
    {
      provide: RECORD_AUDIT_EVENT,
      inject: [AUDIT_REPOSITORY, ID_GENERATOR],
      useFactory: (...deps: ConstructorParameters<typeof RecordAuditEventUseCase>) => new RecordAuditEventUseCase(...deps),
    },
    {
      provide: LIST_AUDIT_LOGS,
      inject: [AUDIT_REPOSITORY, OWNED_PROJECTS],
      useFactory: (...deps: ConstructorParameters<typeof ListAuditLogsUseCase>) => new ListAuditLogsUseCase(...deps),
    },
  ],
})
export class AuditManagementModule {}
