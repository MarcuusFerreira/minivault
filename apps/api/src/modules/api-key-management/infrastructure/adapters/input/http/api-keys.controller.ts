import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { type ApiKeyResponse, type CreateApiKeyRequest, type CreatedApiKeyResponse, createApiKeyRequest } from '@minivault/contracts';
import type { RequestContext } from '../../../../../../shared/domain/principal.js';
import { Ctx } from '../../../../../../shared/infrastructure/http/auth/request-context.decorator.js';
import { uuid } from '../../../../../../shared/infrastructure/http/uuid-param.js';
import type { ApiKeyView } from '../../../../application/dto/api-key-view.js';
import { GENERATE_API_KEY, type GenerateApiKeyPort } from '../../../../application/ports/input/generate-api-key.port.js';
import { LIST_API_KEYS, type ListApiKeysPort } from '../../../../application/ports/input/list-api-keys.port.js';
import { REVOKE_API_KEY, type RevokeApiKeyPort } from '../../../../application/ports/input/revoke-api-key.port.js';
import { ROTATE_API_KEY, type RotateApiKeyPort } from '../../../../application/ports/input/rotate-api-key.port.js';

const toResponse = (view: ApiKeyView): ApiKeyResponse => ({
  id: view.id,
  name: view.name,
  prefix: view.prefix,
  status: view.status,
  grants: view.grants.map(({ environmentId, permissions }) => ({ environmentId, permissions: [...permissions] })),
  expiresAt: view.expiresAt?.toISOString() ?? null,
  lastUsedAt: view.lastUsedAt?.toISOString() ?? null,
  revokedAt: view.revokedAt?.toISOString() ?? null,
  createdAt: view.createdAt.toISOString(),
});

@Controller('projects/:projectId/api-keys')
export class ApiKeysController {
  constructor(
    @Inject(GENERATE_API_KEY) private readonly generateApiKey: GenerateApiKeyPort,
    @Inject(ROTATE_API_KEY) private readonly rotateApiKey: RotateApiKeyPort,
    @Inject(REVOKE_API_KEY) private readonly revokeApiKey: RevokeApiKeyPort,
    @Inject(LIST_API_KEYS) private readonly listApiKeys: ListApiKeysPort,
  ) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  async generate(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Body({ schema: createApiKeyRequest }) body: CreateApiKeyRequest,
  ): Promise<CreatedApiKeyResponse> {
    const expiresAt = body.expiresAt === null ? null : new Date(body.expiresAt);
    const issued = await this.generateApiKey.execute({ context, projectId, name: body.name, grants: body.grants, expiresAt });
    return { ...toResponse(issued), plaintext: issued.plaintext };
  }

  @Get()
  async list(@Ctx() context: RequestContext, @Param('projectId', { schema: uuid }) projectId: string): Promise<ApiKeyResponse[]> {
    return (await this.listApiKeys.execute({ context, projectId })).map(toResponse);
  }

  @Post(':apiKeyId/rotate')
  @Header('Cache-Control', 'no-store')
  async rotate(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('apiKeyId', { schema: uuid }) apiKeyId: string,
  ): Promise<CreatedApiKeyResponse> {
    const issued = await this.rotateApiKey.execute({ context, projectId, apiKeyId });
    return { ...toResponse(issued), plaintext: issued.plaintext };
  }

  /** Revokes. The key stays listed, so its history remains readable. */
  @Delete(':apiKeyId')
  @HttpCode(204)
  async revoke(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('apiKeyId', { schema: uuid }) apiKeyId: string,
  ): Promise<void> {
    await this.revokeApiKey.execute({ context, projectId, apiKeyId });
  }
}
