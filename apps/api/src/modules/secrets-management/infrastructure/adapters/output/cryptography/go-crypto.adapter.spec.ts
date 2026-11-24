import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspect } from 'node:util';
import { EncryptedValue } from '../../../../domain/value-objects/encrypted-value.vo.js';
import { GoCryptoAdapter } from './go-crypto.adapter.js';

const CANARY = 'CANARY-9f3c';
const context = { projectId: 'p', environmentId: 'e', secretId: 's' };
const sealed = EncryptedValue.create({ ciphertext: new Uint8Array(16), nonce: new Uint8Array(12), keyVersion: 1 });
const b64 = (n: number) => Buffer.alloc(n).toString('base64');

describe('GoCryptoAdapter', () => {
  let server: Server;
  let respond: (req: IncomingMessage, res: ServerResponse, body: string) => void;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => respond(req, res, body));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });
  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  const adapter = (port = (server.address() as AddressInfo).port) =>
    new GoCryptoAdapter({ baseUrl: `http://127.0.0.1:${port}`, token: 'service-token', timeoutMs: 300 });
  const json = (status: number, body: unknown) => (_: IncomingMessage, res: ServerResponse) =>
    void res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  const failure = async (run: Promise<unknown>) => {
    const error: unknown = await run.then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(inspect(error, { depth: 10, showHidden: true })).not.toContain(CANARY);
    expect(inspect(error, { depth: 10 })).not.toContain(Buffer.from(CANARY).toString('base64'));
    return error;
  };

  it('authenticates, forwards the correlation id and maps the answer', async () => {
    let seen: { auth?: string | undefined; id?: string | undefined; url?: string | undefined; body?: unknown } = {};
    respond = (req, res, body) => {
      seen = { auth: req.headers.authorization, id: String(req.headers['x-correlation-id']), url: req.url, body: JSON.parse(body) };
      json(200, { ciphertext: b64(20), nonce: b64(12), keyVersion: 3 })(req, res);
    };
    const value = await adapter().encrypt(context, 'á');
    expect(seen).toMatchObject({ auth: 'Bearer service-token', url: '/internal/v1/encrypt', body: { ...context, plaintext: 'w6E=' } });
    expect(seen.id).toMatch(/^[0-9a-f-]{36}$/);
    expect([value.ciphertext.length, value.nonce.length, value.keyVersion]).toEqual([20, 12, 3]);
  });

  it.each<[string, () => void]>([
    ['server error', () => (respond = json(500, {}))],
    ['rejected service token', () => (respond = json(401, {}))],
    ['rejected request', () => (respond = json(400, {}))],
    ['wrong shape', () => (respond = json(200, { hello: 1 }))],
    ['short nonce', () => (respond = json(200, { ciphertext: b64(20), nonce: b64(3), keyVersion: 1 }))],
    ['invalid JSON', () => (respond = (_, res) => void res.writeHead(200).end('<html>'))],
    ['redirect', () => (respond = (_, res) => void res.writeHead(302, { location: 'http://127.0.0.1:1/' }).end())],
    ['dropped connection', () => (respond = (req) => void req.socket.destroy())],
  ])('reports %s as unavailable', async (_name, arrange) => {
    arrange();
    expect(await failure(adapter().encrypt(context, CANARY))).toMatchObject({ code: 'ENCRYPTION_UNAVAILABLE', kind: 'unavailable' });
  });

  it('reports a closed port as unavailable', async () => {
    expect(await failure(adapter(1).encrypt(context, CANARY))).toMatchObject({ code: 'ENCRYPTION_UNAVAILABLE' });
  });

  it('gives up on an engine that never answers', async () => {
    respond = () => {};
    const startedAt = performance.now();
    expect(await failure(adapter().encrypt(context, CANARY))).toMatchObject({ code: 'ENCRYPTION_UNAVAILABLE' });
    expect(performance.now() - startedAt).toBeLessThan(800);
  });

  it('gives up on an answer that never ends', async () => {
    respond = (_, res) => void res.writeHead(200).write('{');
    const startedAt = performance.now();
    expect(await failure(adapter().encrypt(context, CANARY))).toMatchObject({ code: 'ENCRYPTION_UNAVAILABLE' });
    expect(performance.now() - startedAt).toBeLessThan(800);
  });

  it('reports a failed authentication tag as an integrity failure', async () => {
    respond = json(422, { error: { code: 'DECRYPTION_FAILED' } });
    expect(await failure(adapter().decrypt(context, sealed))).toMatchObject({ code: 'SECRET_INTEGRITY_FAILURE', kind: 'internal' });
  });

  it('decodes plaintext', async () => {
    respond = json(200, { plaintext: Buffer.from('á\n').toString('base64') });
    expect(await adapter().decrypt(context, sealed)).toBe('á\n');
    respond = json(200, { plaintext: '' });
    expect(await adapter().decrypt(context, sealed)).toBe('');
  });

  it('refuses plaintext that is not valid UTF-8 instead of altering it', async () => {
    respond = json(200, { plaintext: Buffer.from([0xff, 0xfe]).toString('base64') });
    expect(await failure(adapter().decrypt(context, sealed))).toMatchObject({ code: 'SECRET_INTEGRITY_FAILURE' });
  });
});
