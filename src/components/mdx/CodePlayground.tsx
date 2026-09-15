// Custom CodePlayground component for iframe embeds (CodeSandbox, JSFiddle, CodePen).
//
// Deliberately mirrors the embed snippets these hosts publish themselves: a bare
// iframe with `loading="lazy"` and no `sandbox`/`allow` attributes. Adding those
// attributes is what broke CodePen embeds in Safari, which rejects some sandbox
// flags outright and handles the rest differently from Chrome.
//
// A fallback link is always rendered, so an embed that is refused for any reason
// still leads somewhere instead of leaving a blank bordered box.
//
// No hooks, so this stays usable from server components.

export interface CodePlaygroundProps {
  src: string;
  title?: string;
  height?: string | number;
}

// Hosts whose own published embed snippets use a bare iframe — no `sandbox`,
// no `allow`. Matching them exactly is the only reliably-working configuration:
// Safari rejects some sandbox flags outright and its sandbox handling differs
// enough from Chrome's that these embeds fail intermittently under it.
const TRUSTED_EMBED_HOSTS = ['codepen.io', 'codesandbox.io', 'jsfiddle.net', 'stackblitz.com'];

// Anything outside the allowlist still gets sandboxed, since `src` comes from
// author-written MDX. `allow-presentation` is deliberately absent — Safari
// rejects it as an invalid flag and logs a parse error.
const SANDBOX = 'allow-forms allow-modals allow-popups allow-same-origin allow-scripts';

function isTrustedHost(src: string): boolean {
  try {
    const { hostname } = new URL(withScheme(src));
    return TRUSTED_EMBED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Protocol-relative srcs (`//jsfiddle.net/...`) need a scheme to be linkable. */
function withScheme(src: string): string {
  return src.startsWith('//') ? `https:${src}` : src;
}

/** Human-readable host name, for the fallback link label. */
export function providerLabel(src: string): string {
  const url = withScheme(src);
  if (url.includes('codepen.io')) return 'CodePen';
  if (url.includes('codesandbox.io')) return 'CodeSandbox';
  if (url.includes('jsfiddle.net')) return 'JSFiddle';
  return 'the original site';
}

/**
 * Map an embed URL back to its human-facing page, so the fallback link opens a
 * normal playground rather than a bare embed. Falls back to the src unchanged.
 */
export function canonicalUrl(src: string): string {
  const url = withScheme(src);
  try {
    const parsed = new URL(url);

    // codepen.io/<user>/embed/<slug> -> codepen.io/<user>/pen/<slug>
    if (parsed.hostname.endsWith('codepen.io')) {
      parsed.pathname = parsed.pathname.replace('/embed/', '/pen/');
      parsed.search = '';
      return parsed.toString();
    }

    // codesandbox.io/embed/<id> -> codesandbox.io/s/<id>
    if (parsed.hostname.endsWith('codesandbox.io')) {
      parsed.pathname = parsed.pathname.replace('/embed/', '/s/');
      parsed.search = '';
      return parsed.toString();
    }

    // jsfiddle.net/<user>/<hash>/<rev>/embedded/<panels>/<theme>/ -> drop /embedded/...
    if (parsed.hostname.endsWith('jsfiddle.net')) {
      parsed.pathname = parsed.pathname.replace(/\/embedded\/.*$/, '/');
      parsed.search = '';
      return parsed.toString();
    }

    return url;
  } catch {
    return url;
  }
}

/**
 * The embed iframe itself. Trusted playground hosts get a bare iframe matching
 * their own published snippet; everything else is sandboxed.
 */
export function PlaygroundFrame({ src, title = 'Code Playground', height = 400 }: CodePlaygroundProps) {
  // `height` arrives as a string when authored as height="500". next-mdx-remote
  // drops numeric JSX expression props, so height={500} never reaches us.
  const frameHeight = typeof height === 'string' ? height : String(height);

  return (
    <iframe
      src={withScheme(src)}
      title={title}
      width="100%"
      height={frameHeight}
      loading="lazy"
      style={{ border: 0, display: 'block' }}
      {...(isTrustedHost(src) ? {} : { sandbox: SANDBOX })}
    />
  );
}

export function CodePlayground({
  src,
  title = 'Code Playground',
  height = 400,
}: CodePlaygroundProps) {
  const label = providerLabel(src);

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-[var(--border)]">
      <PlaygroundFrame src={src} title={title} height={height} />
      <div className="px-3 py-2 text-xs">
        <a
          href={canonicalUrl(src)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline opacity-70 hover:opacity-100"
        >
          Open on {label} ↗
        </a>
      </div>
    </div>
  );
}
