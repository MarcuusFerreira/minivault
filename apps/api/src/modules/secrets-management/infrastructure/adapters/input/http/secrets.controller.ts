import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateSecretRequest,
  type SecretMetadataResponse,
  type SecretValueResponse,
  type SecretValuesQuery,
  type UpdateSecretRequest,
  createSecretRequest,
  secretValuesQuery,
  updateSecretRequest,
} from '@minivault/contracts';
import type { RequestContext } from '../../../../../../shared/domain/principal.js';
import { AllowApiKey } from '../../../../../../shared/infrastructure/http/auth/allow-api-key.decorator.js';
import { Ctx } from '../../../../../../shared/infrastructure/http/auth/request-context.decorator.js';
import { uuid } from '../../../../../../shared/infrastructure/http/uuid-param.js';
import type { RevealedSecret, SecretMetadata } from '../../../../application/dto/secret-view.js';
import { DELETE_SECRET, type DeleteSecretPort } from '../../../../application/ports/input/delete-secret.port.js';
import { LIST_SECRET_METADATA, type ListSecretMetadataPort } from '../../../../application/ports/input/list-secret-metadata.port.js';
import { RETRIEVE_SECRET, type RetrieveSecretPort } from '../../../../application/ports/input/retrieve-secret.port.js';
import { RETRIEVE_SECRETS, type RetrieveSecretsPort } from '../../../../application/ports/input/retrieve-secrets.port.js';
import { STORE_SECRET, type StoreSecretPort } from '../../../../application/ports/input/store-secret.port.js';
import { UPDATE_SECRET, type UpdateSecretPort } from '../../../../application/ports/input/update-secret.port.js';

const toMetadata = ({ id, key, encryptionKeyVersion, createdAt, updatedAt }: SecretMetadata): SecretMetadataResponse => ({
  id,
  key,
  encryptionKeyVersion,
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
});
const toRevealed = (secret: RevealedSecret): SecretValueResponse => ({ ...toMetadata(secret), value: secret.value });

@AllowApiKey()
@Controller('projects/:projectId/environments/:environmentId/secrets')
export class SecretsController {
  constructor(
    @Inject(STORE_SECRET) private readonly storeSecret: StoreSecretPort,
    @Inject(UPDATE_SECRET) private readonly updateSecret: UpdateSecretPort,
    @Inject(RETRIEVE_SECRET) private readonly retrieveSecret: RetrieveSecretPort,
    @Inject(RETRIEVE_SECRETS) private readonly retrieveSecrets: RetrieveSecretsPort,
    @Inject(LIST_SECRET_METADATA) private readonly listSecrets: ListSecretMetadataPort,
    @Inject(DELETE_SECRET) private readonly deleteSecret: DeleteSecretPort,
  ) {}

  @Post()
  async store(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
    @Body({ schema: createSecretRequest }) body: CreateSecretRequest,
  ): Promise<SecretMetadataResponse> {
    return toMetadata(await this.storeSecret.execute({ context, projectId, environmentId, key: body.key, value: body.value }));
  }

  /** Metadata only. */
  @Get()
  async list(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
  ): Promise<SecretMetadataResponse[]> {
    return (await this.listSecrets.execute({ context, projectId, environmentId })).map(toMetadata);
  }

  // Declared before :secretId, which would otherwise capture it.
  @Get('values')
  @Header('Cache-Control', 'no-store')
  async values(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
    @Query({ schema: secretValuesQuery }) query: SecretValuesQuery,
  ): Promise<SecretValueResponse[]> {
    const keys = query.keys?.split(',') ?? null;
    return (await this.retrieveSecrets.execute({ context, projectId, environmentId, keys })).map(toRevealed);
  }

  @Get(':secretId')
  @Header('Cache-Control', 'no-store')
  async reveal(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
    @Param('secretId', { schema: uuid }) secretId: string,
  ): Promise<SecretValueResponse> {
    return toRevealed(await this.retrieveSecret.execute({ context, projectId, environmentId, secretId }));
  }

  @Patch(':secretId')
  async update(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
    @Param('secretId', { schema: uuid }) secretId: string,
    @Body({ schema: updateSecretRequest }) body: UpdateSecretRequest,
  ): Promise<SecretMetadataResponse> {
    return toMetadata(await this.updateSecret.execute({ context, projectId, environmentId, secretId, value: body.value }));
  }

  @Delete(':secretId')
  @HttpCode(204)
  async remove(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
    @Param('secretId', { schema: uuid }) secretId: string,
  ): Promise<void> {
    await this.deleteSecret.execute({ context, projectId, environmentId, secretId });
  }
}
