import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ErrorResponse } from '@minivault/contracts';
import type { Response } from 'express';
import { ApplicationError, type ApplicationErrorKind } from '../../application/application-error.js';
import { DomainError } from '../../domain/domain-error.js';

interface MappedError {
  status: number;
  code: string;
  message: string;
  details?: { path: string; message: string }[];
}

const STATUS_BY_KIND: Record<ApplicationErrorKind, number> = {
  not_found: 404,
  conflict: 409,
  forbidden: 403,
  unauthenticated: 401,
  invalid: 422,
  unavailable: 503,
  internal: 500,
};

const HTTP_ERRORS: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'The request is malformed.' },
  401: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
  403: { code: 'FORBIDDEN', message: 'You are not allowed to do this.' },
  404: { code: 'NOT_FOUND', message: 'Not found.' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported media type.' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Try again later.' },
  503: { code: 'UNAVAILABLE', message: 'Service unavailable.' },
};

const UNKNOWN: MappedError = { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' };

/** Framework and parser messages may quote the input, so only our own texts are returned. */
export function mapError(error: unknown): MappedError {
  if (error instanceof ApplicationError) {
    return { status: STATUS_BY_KIND[error.kind], code: error.code, message: error.message };
  }
  if (error instanceof DomainError) {
    return { status: 400, code: error.code, message: error.message };
  }
  const details = validationDetails(error);
  if (details) {
    return { status: 400, code: 'VALIDATION_ERROR', message: 'The request is invalid.', details };
  }
  const status = httpStatusOf(error);
  const known = status === undefined ? undefined : HTTP_ERRORS[status];
  return status !== undefined && known ? { status, ...known } : { ...UNKNOWN };
}

function httpStatusOf(error: unknown): number | undefined {
  if (error instanceof HttpException) return error.getStatus();
  const isParserError = error instanceof Error && 'type' in error && 'status' in error;
  return isParserError && typeof error.status === 'number' ? error.status : undefined;
}

function validationDetails(error: unknown): MappedError['details'] {
  if (!(error instanceof HttpException) || error.getStatus() !== Number(HttpStatus.BAD_REQUEST)) return undefined;
  const body = error.getResponse();
  const messages: unknown = typeof body === 'object' ? (body as { message?: unknown }).message : undefined;
  if (!Array.isArray(messages)) return undefined;
  return messages.map((raw: unknown) => {
    const text = String(raw);
    const separator = text.indexOf(': ');
    return separator === -1
      ? { path: '', message: text }
      : { path: text.slice(0, separator), message: text.slice(separator + 2) };
  });
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(error: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, ...body } = mapError(error);
    const correlationId = String(res.getHeader('X-Correlation-Id') ?? '');
    if (status >= 500) {
      // Name and frames only: an unknown error's message may contain anything.
      const stack = error instanceof Error ? error.stack?.split('\n').filter((line) => line.trim().startsWith('at ')) : undefined;
      this.logger.error('request failed', {
        correlationId,
        code: body.code,
        error: error instanceof Error ? error.name : typeof error,
        stack,
      });
    }
    res.status(status).json({ error: { ...body, correlationId } } satisfies ErrorResponse);
  }
}
