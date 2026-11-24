import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');
const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.tsx') && !f.includes('test'))
  .map((f) => [f, readFileSync(`src/${f}`, 'utf8')] as const);

it('uses a proportional face for the interface and a monospaced one for code', () => {
  expect(css).toMatch(/--font-sans: 'Instrument Sans Variable'/);
  expect(css).toMatch(/--font-mono: 'IBM Plex Mono'/);
  expect(css).toContain('--color-signal: #ffb84d');
});

it.each(sources)('%s adds no hue of its own', (_file, source) => {
  expect(source).not.toMatch(/\b(?:text|bg|border)-(?:red|green|blue|yellow|amber|orange|purple|pink|emerald|sky)-/);
});

it('uses the signal color only where plaintext is shown', () => {
  const users = sources.filter(([, source]) => /\b(?:text|bg|border)-signal/.test(source)).map(([file]) => file.split('/').pop());
  expect(users.sort()).toEqual(['exposure-indicator.tsx', 'plaintext.tsx']);
});
