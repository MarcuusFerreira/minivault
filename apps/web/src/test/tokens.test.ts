import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');
const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.tsx') && !f.includes('test'))
  .map((f) => [f, readFileSync(`src/${f}`, 'utf8')] as const);

it('holds the Industrial tokens', () => {
  expect(css).toContain('#0b0c0a');
  expect(css).toContain('--color-signal: #ffb800');
  expect(css).toContain("'IBM Plex Mono'");
  expect(css).not.toMatch(/box-shadow:(?!\s*none)/);
  expect(css).toContain('--radius: 0');
});

it.each(sources)('%s adds no radius, shadow or hue of its own', (_file, source) => {
  expect(source).not.toMatch(/\brounded(?!-none)/);
  expect(source).not.toMatch(/\bshadow-/);
  expect(source).not.toMatch(/\b(?:text|bg|border)-(?:red|green|blue|yellow|amber|orange|purple|pink|emerald|sky)-/);
});

it('uses the signal color only where plaintext is shown', () => {
  const users = sources.filter(([, source]) => /\b(?:text|bg|border)-signal/.test(source)).map(([file]) => file.split('/').pop());
  expect(users.sort()).toEqual(['exposure-indicator.tsx', 'plaintext.tsx']);
});
