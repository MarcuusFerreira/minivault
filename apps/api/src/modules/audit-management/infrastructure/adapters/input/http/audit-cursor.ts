import { z } from 'zod';
import type { ListAuditLogsQuery } from '../../../../application/ports/input/list-audit-logs.port.js';
import { InvalidAuditCursorError } from '../../../../domain/exceptions/audit.errors.js';

type Position = NonNullable<ListAuditLogsQuery['after']>;
const shape = z.tuple([z.iso.datetime(), z.uuid()]);

export function encodeCursor({ createdAt, id }: Position): string {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id])).toString('base64url');
}

export function decodeCursor(cursor: string): Position {
  try {
    const [createdAt, id] = shape.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
    return { createdAt: new Date(createdAt), id };
  } catch {
    throw new InvalidAuditCursorError();
  }
}
