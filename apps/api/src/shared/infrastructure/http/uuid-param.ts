import { z } from 'zod';

/** Canonical lowercase, because ids are part of the authenticated encryption context. */
export const uuid = z.uuid().transform((value) => value.toLowerCase());
