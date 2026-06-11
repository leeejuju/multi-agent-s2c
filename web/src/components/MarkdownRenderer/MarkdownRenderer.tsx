import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import katex from "katex";
import MarkdownIt from "markdown-it";
import type { BundledLanguage, Highlighter } from "shiki";
import "katex/dist/katex.min.css";
import "./MarkdownRenderer.css";

const SHIKI_THEME = "github-light";
const SHIKI_LANGUAGES = [
  "bash",
  "css",
  "html",
  "javascript",
  "json",
  "markdown",
  "python",
  "tsx",
  "typescript",
] as const satisfies BundledLanguage[];

const LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  cjs: "javascript",
  console: "bash",
  html: "html",
  js: "javascript",
  jsx: "tsx",
  md: "markdown",
  py: "python",
  shell: "bash",
  sh: "bash",
  ts: "typescript",
  tsx: "tsx",
  zsh: "bash",
};

let highlighterPromise: Promise<Highlighter> | null = null;

type MarkdownRendererProps = {
  className?: string;
  content: string;
  streaming?: boolean;
};

function getHighlighter() {
  highlighterPromise ??= import("shiki").then(({ createHighlighter }) =>
    createHighlighter({
      langs: [...SHIKI_LANGUAGES],
      themes: [SHIKI_THEME],
    }),
  );
  return highlighterPromise;
}

function hasCodeFence(content: string) {
  return /^ {0,3}(`{3,}|~{3,})/m.test(content);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function normalizeLanguage(info: string): BundledLanguage | null {
  const rawLanguage = info.trim().split(/\s+/)[0]?.toLowerCase();
  if (!rawLanguage) return null;

  if (rawLanguage in LANGUAGE_ALIASES) {
    return LANGUAGE_ALIASES[rawLanguage];
  }

  if ((SHIKI_LANGUAGES as readonly string[]).includes(rawLanguage)) {
    return rawLanguage as BundledLanguage;
  }

  return null;
}

function renderFallbackCode(code: string, info: string) {
  const label = info.trim().split(/\s+/)[0] || "text";
  return [
    `<pre class="shiki markdown-code-fallback" data-language="${escapeAttribute(label)}">`,
    `<code>${escapeHtml(code)}</code>`,
    "</pre>",
  ].join("");
}

function renderCodeBlock(code: string, info: string, highlighter: Highlighter | null) {
  const language = normalizeLanguage(info);
  if (!language || !highlighter) {
    return renderFallbackCode(code, info);
  }

  try {
    const html = highlighter.codeToHtml(code, {
      lang: language,
      theme: SHIKI_THEME,
    });
    return `<div class="markdown-code-frame" data-language="${escapeAttribute(language)}">${html}</div>`;
  } catch {
    return renderFallbackCode(code, info);
  }
}

function renderMath(content: string, displayMode: boolean) {
  return katex.renderToString(content, {
    displayMode,
    output: "htmlAndMathml",
    strict: "ignore",
    throwOnError: false,
    trust: false,
  });
}

function addMathRules(md: MarkdownIt) {
  md.inline.ruler.after("escape", "math_inline", (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x24 || state.src[start + 1] === "$") {
      return false;
    }
    if (start > 0 && state.src[start - 1] === "\\") {
      return false;
    }

    let pos = start + 1;
    if (pos >= state.posMax || /\s/.test(state.src[pos])) {
      return false;
    }

    while (pos < state.posMax) {
      if (state.src[pos] === "$" && state.src[pos - 1] !== "\\") {
        if (pos === start + 1 || /\s/.test(state.src[pos - 1])) {
          return false;
        }
        if (!silent) {
          const token = state.push("math_inline", "math", 0);
          token.content = state.src.slice(start + 1, pos);
        }
        state.pos = pos + 1;
        return true;
      }
      pos += 1;
    }

    return false;
  });

  md.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const marker = state.src.slice(start, start + 2);
    if (marker !== "$$") {
      return false;
    }

    if (silent) {
      return true;
    }

    const firstLine = state.src.slice(start + 2, max);
    let content = "";
    let nextLine = startLine;
    let haveEnd = false;
    const inlineClose = firstLine.lastIndexOf("$$");

    if (inlineClose >= 0 && firstLine.slice(inlineClose + 2).trim() === "") {
      content = firstLine.slice(0, inlineClose);
      haveEnd = true;
    } else {
      content = firstLine;
      while (nextLine + 1 < endLine) {
        nextLine += 1;
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lineMax = state.eMarks[nextLine];
        const line = state.src.slice(lineStart, lineMax);
        const closeIndex = line.lastIndexOf("$$");

        if (closeIndex >= 0 && line.slice(closeIndex + 2).trim() === "") {
          content += `\n${line.slice(0, closeIndex)}`;
          haveEnd = true;
          break;
        }

        content += `\n${line}`;
      }
    }

    if (!haveEnd) {
      return false;
    }

    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.content = content.trim();
    token.map = [startLine, nextLine + 1];
    state.line = nextLine + 1;
    return true;
  });

  md.renderer.rules.math_inline = (tokens, idx) =>
    `<span class="markdown-math markdown-math-inline">${renderMath(tokens[idx].content, false)}</span>`;

  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="markdown-math markdown-math-block">${renderMath(tokens[idx].content, true)}</div>`;
}

function addLinkRules(md: MarkdownIt) {
  const defaultLinkOpen =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noreferrer noopener");
    return defaultLinkOpen(tokens, idx, options, env, self);
  };
}

function createMarkdownIt(highlighter: Highlighter | null) {
  const md = new MarkdownIt({
    breaks: true,
    highlight: (code, info) => renderCodeBlock(code, info, highlighter),
    html: false,
    linkify: true,
    typographer: false,
  });

  addMathRules(md);
  addLinkRules(md);
  return md;
}

function getUnclosedFenceMarker(markdown: string) {
  let openFence: { char: "`" | "~"; length: number } | null = null;

  for (const line of markdown.split("\n")) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (!match) continue;

    const marker = match[1];
    const char = marker[0] as "`" | "~";
    if (!openFence) {
      openFence = { char, length: marker.length };
      continue;
    }

    if (openFence.char === char && marker.length >= openFence.length) {
      openFence = null;
    }
  }

  return openFence ? openFence.char.repeat(openFence.length) : null;
}

function hasUnclosedMathBlock(markdown: string) {
  let open = false;

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("$$")) continue;

    const rest = trimmed.slice(2);
    if (!open && !rest.includes("$$")) {
      open = true;
      continue;
    }

    if (open && trimmed.endsWith("$$")) {
      open = false;
    }
  }

  return open;
}

function normalizeStreamingMarkdown(content: string, streaming: boolean) {
  let markdown = content.replace(/\r\n?/g, "\n");
  if (!streaming) return markdown;

  const fenceMarker = getUnclosedFenceMarker(markdown);
  if (fenceMarker) {
    markdown += `\n${fenceMarker}`;
  }

  if (hasUnclosedMathBlock(markdown)) {
    markdown += "\n$$";
  }

  return markdown;
}

export function renderMarkdownContent(
  content: string,
  options: { highlighter?: Highlighter | null; streaming?: boolean } = {},
) {
  const md = createMarkdownIt(options.highlighter ?? null);
  const html = md.render(normalizeStreamingMarkdown(content, Boolean(options.streaming)));
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["class", "style", "target", "rel", "data-language", "aria-hidden"],
    ADD_TAGS: ["math", "mi", "mn", "mo", "msup", "mrow", "semantics", "annotation"],
  });
}

export default function MarkdownRenderer({
  className = "",
  content,
  streaming = false,
}: MarkdownRendererProps) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    if (!hasCodeFence(content)) {
      return;
    }

    let mounted = true;
    void getHighlighter().then((instance) => {
      if (mounted) {
        setHighlighter(instance);
      }
    });
    return () => {
      mounted = false;
    };
  }, [content]);

  const html = useMemo(
    () => renderMarkdownContent(content, { highlighter, streaming }),
    [content, highlighter, streaming],
  );

  return (
    <div
      className={`markdown-body break-words ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
