export default async function teardown() {
  await globalThis.__postgres?.stop();
}
