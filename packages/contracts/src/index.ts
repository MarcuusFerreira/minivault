/** Error body returned by every MiniVault endpoint. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: { path: string; message: string }[];
  };
}
