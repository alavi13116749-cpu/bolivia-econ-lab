import { useMemo } from 'react';
import { renderMarkdown, renderTex } from '../lib/markdown';

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return <div className={`prose-lab ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(() => renderTex(tex, display), [tex, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
