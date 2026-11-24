import type { Grant } from '../../../../shared/domain/principal.js';
import { InvalidApiKeyGrantsError } from '../exceptions/api-key.errors.js';

export class EnvironmentGrants {
  private constructor(readonly values: readonly Grant[]) {}

  static create(grants: readonly Grant[]): EnvironmentGrants {
    const distinct = <T>(items: readonly T[]) => new Set(items).size === items.length;
    const valid =
      grants.length > 0 &&
      distinct(grants.map((grant) => grant.environmentId)) &&
      grants.every((grant) => grant.permissions.length > 0 && distinct(grant.permissions));
    if (!valid) throw new InvalidApiKeyGrantsError();
    return new EnvironmentGrants(grants);
  }

  /** May be empty: deleting an environment removes its grants. */
  static restore(grants: readonly Grant[]): EnvironmentGrants {
    return new EnvironmentGrants(grants);
  }
}
