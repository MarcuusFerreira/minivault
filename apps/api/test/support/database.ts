import type { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service.js';

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, projects, environments, secrets, api_keys, api_key_grants, audit_logs CASCADE',
  );
}
