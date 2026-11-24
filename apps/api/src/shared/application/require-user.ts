import type { RequestContext } from '../domain/principal.js';
import { ApplicationError } from './application-error.js';

/** The id of the calling user. API keys are refused. */
export function requireUser(context: RequestContext): string {
  if (context.principal.kind !== 'user') {
    throw new ApplicationError('FORBIDDEN', 'forbidden', 'You are not allowed to do this.');
  }
  return context.principal.userId;
}
