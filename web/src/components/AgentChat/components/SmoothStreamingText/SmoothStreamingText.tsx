import { useEffect, useMemo, useState } from "react";

import "./SmoothStreamingText.css";

type SmoothStreamingTextProps = {
  className?: string;
  content: string;
  onSettled?: () => void;
};

const PUNCTUATION_PAUSE_CHARS = new Set([
  ",",
  ".",
  "!",
  "?",
  ";",
  ":",
  ")",
  "\u3001",
  "\u3002",
  "\uFF01",
  "\uFF09",
  "\uFF0C",
  "\uFF1A",
  "\uFF1B",
  "\uFF1F",
]);

function getRevealLength(backlog: number) {
  if (backlog > 360) return Math.ceil(backlog * 0.18);
  if (backlog > 160) return 32;
  if (backlog > 80) return 18;
  if (backlog > 32) return 8;
  if (backlog > 12) return 4;
  if (backlog > 5) return 2;
  return 1;
}

function getPauseDelay(visibleContent: string, backlog: number) {
  if (backlog > 80 || visibleContent.length === 0) return 0;
  return PUNCTUATION_PAUSE_CHARS.has(visibleContent.at(-1) ?? "") ? 42 : 0;
}

export default function SmoothStreamingText({
  className = "",
  content,
  onSettled,
}: SmoothStreamingTextProps) {
  const [visibleContent, setVisibleContent] = useState(content);
  const [tailStart, setTailStart] = useState(content.length);
  const [tailKey, setTailKey] = useState(0);

  useEffect(() => {
    if (content.length < visibleContent.length || !content.startsWith(visibleContent)) {
      setTailStart(content.length);
      setVisibleContent(content);
      return;
    }

    if (visibleContent === content) {
      return;
    }

    const backlog = content.length - visibleContent.length;
    const revealLength = getRevealLength(backlog);
    const pauseDelay = getPauseDelay(visibleContent, backlog);
    let frameId: number | null = null;
    let timeoutId: number | null = null;

    const revealNext = () => {
      const nextLength = Math.min(content.length, visibleContent.length + revealLength);
      setTailStart(visibleContent.length);
      setTailKey((current) => current + 1);
      setVisibleContent(content.slice(0, nextLength));
    };

    if (pauseDelay > 0) {
      timeoutId = window.setTimeout(() => {
        frameId = window.requestAnimationFrame(revealNext);
      }, pauseDelay);
    } else {
      frameId = window.requestAnimationFrame(revealNext);
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [content, visibleContent]);

  useEffect(() => {
    if (visibleContent === content) {
      onSettled?.();
    }
  }, [content, onSettled, visibleContent]);

  const { stableContent, tailContent } = useMemo(
    () => ({
      stableContent: visibleContent.slice(0, tailStart),
      tailContent: visibleContent.slice(tailStart),
    }),
    [tailStart, visibleContent],
  );

  return (
    <span className={`smooth-streaming-text ${className}`.trim()}>
      {stableContent}
      {tailContent && (
        <span className="smooth-streaming-tail" key={tailKey}>
          {tailContent}
        </span>
      )}
    </span>
  );
}
