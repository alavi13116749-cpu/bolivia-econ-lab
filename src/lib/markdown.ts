import { Marked } from 'marked';
import katex from 'katex';
import DOMPurify from 'dompurify';

const marked = new Marked({ gfm: true, breaks: false });

/**
 * Markdown + LaTeX ($…$, $$…$$, \(…\), \[…\]) → HTML saneado.
 * Las fórmulas se extraen antes de pasar por marked para que los _ y * no se interpreten.
 */
export function renderMarkdown(src: string): string {
  const math: string[] = [];
  const stash = (tex: string, display: boolean) => {
    let html: string;
    try {
      html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false, output: 'html' });
    } catch {
      html = `<code>${tex.replace(/</g, '&lt;')}</code>`;
    }
    math.push(html);
    return `@@MATH${math.length - 1}@@`;
  };
  // Proteger bloques de código para no tocar su contenido
  const code: string[] = [];
  let text = src.replace(/```[\s\S]*?```|`[^`\n]+`/g, (m) => {
    code.push(m);
    return `@@CODE${code.length - 1}@@`;
  });
  text = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => stash(t, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => stash(t, false))
    .replace(/(^|[^\\$\w])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g, (_, pre, t) => pre + stash(t, false));
  text = text.replace(/@@CODE(\d+)@@/g, (_, i) => code[Number(i)]);
  let html = marked.parse(text, { async: false }) as string;
  html = html.replace(/@@MATH(\d+)@@/g, (_, i) => math[Number(i)]);
  return DOMPurify.sanitize(html, { ADD_ATTR: ['aria-hidden', 'style', 'encoding'], ADD_TAGS: ['math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mtext', 'mspace', 'mover', 'munder', 'mtable', 'mtr', 'mtd', 'mstyle'] });
}

export function renderTex(tex: string, display = false): string {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false });
}
