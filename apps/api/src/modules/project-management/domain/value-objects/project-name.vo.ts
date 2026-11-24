import { isStorableText } from '../../../../shared/domain/text.js';
import { InvalidProjectNameError } from '../exceptions/project.errors.js';

export class ProjectName {
  private constructor(readonly value: string) {}

  static create(raw: string): ProjectName {
    const value = raw.trim();
    if (value.length < 1 || value.length > 100 || !isStorableText(value)) throw new InvalidProjectNameError();
    return new ProjectName(value);
  }
}
