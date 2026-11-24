import { BadRequestException, HttpException } from '@nestjs/common';
import { ApplicationError, type ApplicationErrorKind } from '../../application/application-error.js';
import { DomainError } from '../../domain/domain-error.js';
import { mapError } from './error.filter.js';

class NameInvalid extends DomainError {
  readonly code = 'NAME_INVALID';
}

describe('mapError', () => {
  it.each<[ApplicationErrorKind, number]>([
    ['not_found', 404],
    ['conflict', 409],
    ['forbidden', 403],
    ['unauthenticated', 401],
    ['invalid', 422],
    ['unavailable', 503],
    ['internal', 500],
  ])('maps %s to %d', (kind, status) => {
    expect(mapError(new ApplicationError('SOME_CODE', kind, 'Text'))).toMatchObject({
      status,
      code: 'SOME_CODE',
      message: 'Text',
    });
  });

  it('maps domain errors to 400', () => {
    expect(mapError(new NameInvalid('Bad name'))).toMatchObject({ status: 400, code: 'NAME_INVALID', message: 'Bad name' });
  });

  it('hides the text of unknown errors', () => {
    const mapped = mapError(new Error('password=hunter2'));
    expect(mapped).toEqual({ status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
  });

  it('turns schema failures into VALIDATION_ERROR details', () => {
    const error = new BadRequestException({ statusCode: 400, message: ['email: Invalid email'] });
    expect(mapError(error)).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [{ path: 'email', message: 'Invalid email' }],
    });
  });

  it('never repeats a body parser message, which quotes the input', () => {
    const mapped = mapError(new BadRequestException('Unexpected token s in JSON: "s3cret"'));
    expect(JSON.stringify(mapped)).not.toContain('s3cret');
    expect(mapped.code).toBe('BAD_REQUEST');
  });

  it.each([
    [413, 'PAYLOAD_TOO_LARGE'],
    [404, 'NOT_FOUND'],
    [429, 'TOO_MANY_REQUESTS'],
  ])('gives HTTP %d the code %s', (status, code) => {
    expect(mapError(new HttpException('x', status))).toMatchObject({ status, code });
  });

  it('recognizes body parser errors that are not Nest exceptions', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), { status: 413, type: 'entity.too.large' });
    expect(mapError(tooLarge)).toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' });
  });
});
