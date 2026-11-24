/** Captures everything the process writes while the work runs. */
export async function captureOutput(work: () => Promise<void>): Promise<string> {
  let captured = '';
  const originals = [process.stdout, process.stderr].map((stream) => {
    const write = stream.write.bind(stream);
    stream.write = ((chunk: string | Uint8Array, ...rest: never[]) => {
      captured += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
      return write(chunk, ...rest);
    }) as typeof stream.write;
    return () => (stream.write = write);
  });
  try {
    await work();
  } finally {
    originals.forEach((restore) => restore());
  }
  return captured;
}
