/** Error body returned by every MiniVault endpoint. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: { path: string; message: string }[];
  };
}
export * from './auth.js';
export * from './projects.js';
export * from './environments.js';
