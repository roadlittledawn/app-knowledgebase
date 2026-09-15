/**
 * MDX pipeline regression tests.
 *
 * Guards the serialization path that embeds depend on: query strings in `src`
 * are the fragile part (`&` and percent-encoding must survive), and
 * rehypeUnwrapBlocks mutates the tree while visiting, so embeds must also
 * survive a realistic multi-component document.
 *
 * Runner: node --experimental-strip-types (tsx's CJS interop trips over the
 * ESM-only MDX dependency graph).
 */

import assert from 'node:assert/strict';
import { serializeMDX } from '../../src/lib/mdx/serialize.ts';
import { test, finish, log } from './harness.ts';

const CODEPEN = 'https://codepen.io/roadlittledawn/embed/dwPdJE?default-tab=&editable=true';
const CODESANDBOX = 'https://codesandbox.io/embed/lekkv?view=preview&module=%2Fpublic%2Findex.html';
const JSFIDDLE = '//jsfiddle.net/roadlittledawn/nf65r4k1/62/embedded/js,css,result/dark/';

async function main() {
  log('MDX pipeline: embed src integrity');

  await test('preserves each embed src byte-for-byte', async () => {
    for (const src of [JSFIDDLE, CODEPEN, CODESANDBOX]) {
      const { compiledSource } = await serializeMDX(`<CodePlayground title="T" src="${src}" />`);
      assert.ok(compiledSource.includes(src), `src was mangled or dropped: ${src}`);
    }
  });

  await test('does not HTML-escape ampersands in query strings', async () => {
    const { compiledSource } = await serializeMDX(`<CodePlayground title="T" src="${CODEPEN}" />`);
    assert.ok(
      !compiledSource.includes('default-tab=&amp;'),
      'ampersand was HTML-escaped, which corrupts the query string'
    );
  });

  await test('preserves percent-encoding in query strings', async () => {
    const { compiledSource } = await serializeMDX(
      `<CodePlayground title="T" src="${CODESANDBOX}" />`
    );
    assert.ok(compiledSource.includes('%2Fpublic%2Findex.html'), 'percent-encoding was altered');
  });

  log('\nMDX pipeline: full document');

  await test('keeps all embeds in a document with other block components', async () => {
    const mdx = [
      '## Callout',
      '',
      '<Callout variant="caution">Careful.</Callout>',
      '',
      '## Cards',
      '',
      '<CardGrid columns="2">',
      '  <Card title="One">First.</Card>',
      '</CardGrid>',
      '',
      '```javascript',
      'const x = 1;',
      '```',
      '',
      '## Code playground embeds',
      '',
      '### JSFiddle',
      '',
      `<CodePlayground title="JSFiddle" src="${JSFIDDLE}" />`,
      '',
      '### CodePen',
      '',
      `<CodePlayground title="CodePen" src="${CODEPEN}" />`,
      '',
      '### CodeSandbox',
      '',
      `<CodePlayground title="CodeSandbox" src="${CODESANDBOX}" />`,
      '',
    ].join('\n');

    const { compiledSource } = await serializeMDX(mdx);

    for (const host of ['jsfiddle.net', 'codepen.io', 'codesandbox.io']) {
      assert.ok(compiledSource.includes(host), `${host} embed missing from output`);
    }
    const count = (compiledSource.match(/CodePlayground/g) ?? []).length;
    assert.ok(count >= 3, `expected at least 3 CodePlayground references, found ${count}`);
  });

  finish('MDX pipeline');
}

main();
