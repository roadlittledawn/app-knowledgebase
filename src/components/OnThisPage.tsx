'use client';

import { useEffect, useState, useCallback } from 'react';

interface HeadingEntry {
  id: string;
  text: string;
  level: number;
}

export function OnThisPage() {
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);

  const scanHeadings = useCallback(() => {
    const article = document.querySelector('article');
    if (!article) return;

    const elements = article.querySelectorAll('h2[id], h3[id]');
    const items: HeadingEntry[] = [];

    elements.forEach((el) => {
      const id = el.getAttribute('id');
      const text = el.textContent?.trim();
      if (id && text) {
        const level = el.tagName === 'H2' ? 2 : 3;
        items.push({ id, text, level });
      }
    });

    setHeadings(items);
  }, []);

  useEffect(() => {
    const article = document.querySelector('article');
    if (!article) return;

    // Use MutationObserver to subscribe to DOM changes
    const observer = new MutationObserver(scanHeadings);
    observer.observe(article, { childList: true, subtree: true });

    // Defer initial scan to after MDX content renders
    const frameId = requestAnimationFrame(scanHeadings);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [scanHeadings]);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    // Find the scrollable main content area
    const main = document.querySelector('main');
    if (main) {
      const mainTop = target.offsetTop - offset;
      main.scrollTo({ top: mainTop, behavior: 'smooth' });
    } else {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <nav aria-label="On this page">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
        On this Page
      </h3>
      <div className="on-this-page-container relative">
        <ul className="on-this-page-list space-y-1 max-h-[400px] overflow-y-auto pr-2">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={`block text-xs leading-snug transition-colors hover:text-[var(--color-primary)] text-[var(--color-foreground-secondary)] ${
                  heading.level === 3 ? 'pl-3' : ''
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
        <div className="on-this-page-fade pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
      </div>
    </nav>
  );
}
