import { ValueTransformer } from 'typeorm';

/**
 * Postgres `numeric` columns come back as strings via pg driver; this keeps
 * the API surface (and arithmetic in services) working with plain numbers.
 */
export class DecimalColumnTransformer implements ValueTransformer {
  to(data?: number | null): number | null | undefined {
    return data;
  }

  from(data?: string | null): number | null {
    if (data === null || data === undefined) {
      return null;
    }
    return parseFloat(data);
  }
}
