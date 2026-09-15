/**
 * CodePlayground component regression tests.
 *
 * Hermetic by design — no network. Playground hosts sit behind bot protection
 * that intermittently refuses automated requests, so asserting live embed
 * reachability would flake in CI. These assert what we control: the markup we
 * emit and the URL normalization behind the fallback link.
 *
 * Runner: tsx (needs a JSX transform for the .tsx import).
 */

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CodePlayground,
  PlaygroundFrame,
  canonicalUrl,
  providerLabel,
  type CodePlaygroundProps,
} from '../../src/components/mdx/CodePlayground';
import { test, finish, log } from './harness';

const CODEPEN = 'https://codepen.io/roadlittledawn/embed/dwPdJE?default-tab=&editable=true';
const CODESANDBOX = 'https://codesandbox.io/embed/lekkv?view=preview&module=%2Fpublic%2Findex.html';
const JSFIDDLE = '//jsfiddle.net/roadlittledawn/nf65r4k1/62/embedded/js,css,result/dark/';

function render(props: CodePlaygroundProps): string {
  return renderToStaticMarkup(createElement(CodePlayground, props));
}

/** The embed iframe on its own, for attribute-level assertions. */
function renderFrame(props: CodePlaygroundProps): string {
  return renderToStaticMarkup(createElement(PlaygroundFrame, props));
}

async function main() {
  log('CodePlayground: embed markup');

  await test('renders the embed iframe directly, with no interstitial', () => {
    const html = render({ src: CODEPEN, title: 'Traffic light' });
    assert.ok(html.includes('<iframe'), 'expected the embed iframe in the initial render');
    assert.ok(!html.includes('<button'), 'no click-to-load gate: the iframe loads on its own');
  });

  await test('points the iframe at the author-supplied src', () => {
    const html = render({ src: CODEPEN, title: 'Traffic light' });
    // `&` is HTML-escaped in the attribute value; the browser decodes it back.
    const escaped = CODEPEN.replace(/&/g, '&amp;');
    assert.ok(html.includes(`src="${escaped}"`), `src was altered: ${html}`);
  });

  await test('titles the iframe with the author-supplied title', () => {
    const html = render({ src: CODEPEN, title: 'Traffic light exercise' });
    assert.ok(html.includes('title="Traffic light exercise"'), 'expected title on the iframe');
  });

  await test('gives protocol-relative srcs a scheme', () => {
    const html = render({ src: JSFIDDLE, title: 'T' });
    assert.ok(html.includes(`src="https:${JSFIDDLE}"`), 'expected https: prepended to //host/...');
  });

  log('\nCodePlayground: fallback link');

  await test('links to the canonical page, not the embed URL', () => {
    const html = render({ src: CODEPEN, title: 'T' });
    assert.ok(
      html.includes('https://codepen.io/roadlittledawn/pen/dwPdJE'),
      'expected canonical pen URL in fallback link'
    );
  });

  await test('external link carries noopener noreferrer', () => {
    const html = render({ src: CODEPEN, title: 'T' });
    assert.ok(html.includes('rel="noopener noreferrer"'), 'external link needs noopener noreferrer');
  });

  log('\nsandbox flags');

  await test('never emits allow-presentation (Safari rejects it as invalid)', () => {
    // Assert on rendered output, not source text: the sandboxed path is the
    // only one that emits flags at all.
    const html = renderFrame({ src: 'https://unknown.example.com/embed/x', title: 'T' });
    assert.ok(html.includes('sandbox='), 'expected the sandboxed path for this assertion');
    assert.ok(
      !html.includes('allow-presentation'),
      'allow-presentation is rejected by Safari and must not be emitted'
    );
  });

  await test('trusted playground hosts get a bare iframe, matching their own embed code', () => {
    for (const src of [CODEPEN, CODESANDBOX, JSFIDDLE]) {
      const html = renderFrame({ src, title: 'T' });
      assert.ok(html.includes('<iframe'), `expected an iframe for ${src}`);
      assert.ok(!html.includes('sandbox='), `${src} must not be sandboxed`);
      assert.ok(!html.includes('allow='), `${src} must not carry an allow attribute`);
    }
  });

  await test('untrusted hosts are still sandboxed (src is author-controlled)', () => {
    const html = renderFrame({ src: 'https://untrusted.example.com/embed/x', title: 'T' });
    assert.ok(html.includes('sandbox='), 'unknown hosts must be sandboxed');
    for (const flag of ['allow-forms', 'allow-modals', 'allow-popups', 'allow-scripts']) {
      assert.ok(html.includes(flag), `expected sandbox flag ${flag}`);
    }
  });

  await test('iframe is lazy, matching the published embed snippets', () => {
    const html = render({ src: CODEPEN, title: 'T' });
    assert.ok(html.includes('loading="lazy"'), 'expected loading="lazy"');
  });

  log('\nURL normalization');

  await test('maps a CodePen embed URL to its pen page', () => {
    assert.equal(
      canonicalUrl('https://codepen.io/u/embed/abc?default-tab=&editable=true'),
      'https://codepen.io/u/pen/abc'
    );
  });

  await test('maps a CodeSandbox embed URL to its sandbox page', () => {
    assert.equal(
      canonicalUrl('https://codesandbox.io/embed/lekkv?view=preview'),
      'https://codesandbox.io/s/lekkv'
    );
  });

  await test('gives protocol-relative JSFiddle URLs a scheme and strips /embedded/', () => {
    const out = canonicalUrl(JSFIDDLE);
    assert.ok(out.startsWith('https://'), `expected https scheme, got ${out}`);
    assert.ok(!out.includes('/embedded/'), 'expected /embedded/ segment stripped');
  });

  await test('labels each known provider', () => {
    assert.equal(providerLabel(CODEPEN), 'CodePen');
    assert.equal(providerLabel(CODESANDBOX), 'CodeSandbox');
    assert.equal(providerLabel(JSFIDDLE), 'JSFiddle');
  });

  finish('CodePlayground');
}

main();
