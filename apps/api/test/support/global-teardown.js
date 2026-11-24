export default async function teardown() {
  await globalThis.__engine?.stop();
  await globalThis.__postgres?.stop();
}
