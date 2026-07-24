from __future__ import annotations

import html
import re

from .types import CleanedChunk

POSITION_TAG_RE = re.compile(r"@@\d+(?:\t[-+]?\d+(?:\.\d+)?){4}##")
HEADING_RE = re.compile(
    r"^(#{1,6}\s+|第[一二三四五六七八九十百千万\d]+[章节条编]|"
    r"(?:\d+\.)+\d*\s+|[一二三四五六七八九十]+[、.])"
)
LAW_HEADING_RE = re.compile(
    r"^(第[一二三四五六七八九十百千万\d]+[条章节编]|Article\s+\d+)",
    re.IGNORECASE,
)
QA_Q_RE = re.compile(
    r"^(?:问题|问|Q|Question|User)\s*[:：\t ]+\s*(.+)$",
    re.IGNORECASE,
)
QA_A_RE = re.compile(
    r"^(?:答案|回答|答|A|Answer|Assistant)\s*[:：\t ]+\s*(.+)$",
    re.IGNORECASE,
)


def normalize_text(text: str) -> str:
    text = html.unescape(text or "")
    text = POSITION_TAG_RE.sub("", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\u3000", " ")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def lines(text: str) -> list[str]:
    return [line for line in text.split("\n") if line.strip()]


def paragraphs(text: str) -> list[str]:
    return [
        paragraph.strip()
        for paragraph in re.split(r"\n\s*\n", text)
        if paragraph.strip()
    ]


def is_heading(line: str) -> bool:
    return bool(HEADING_RE.match(line.strip()))


def has_headings(text: str) -> bool:
    return any(is_heading(line) for line in lines(text))


def heading_text(line: str) -> str:
    return re.sub(r"^#{1,6}\s+", "", line).strip()


def markdown_heading_level(line: str) -> int:
    match = re.match(r"^(#{1,6})\s+(.+)$", line)
    return len(match.group(1)) if match else 0


def split_long_text(text: str, chunk_size: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    sentences = re.split(r"(?<=[。！？!?；;])\s*", text)
    parts: list[str] = []
    current = ""
    for sentence in sentences:
        if not sentence:
            continue
        if current and len(current) + len(sentence) > chunk_size:
            parts.append(current.strip())
            current = ""
        current += sentence
    if current.strip():
        parts.append(current.strip())
    return parts or [text]


def remove_toc_lines(input_lines: list[str]) -> list[str]:
    result: list[str] = []
    in_toc = False
    skipped = 0
    for line in input_lines:
        if re.fullmatch(r"(目录|contents|table of contents)", line, re.IGNORECASE):
            in_toc = True
            skipped = 0
            continue
        if in_toc:
            skipped += 1
            if skipped <= 80 and looks_like_toc_entry(line):
                continue
            in_toc = False
        result.append(line)
    return result


def make_colon_titles(input_lines: list[str]) -> list[str]:
    result: list[str] = []
    for line in input_lines:
        if not is_heading(line) and len(line) <= 48 and re.search(r"[:：]$", line):
            result.append(f"## {line.rstrip(':：')}")
        else:
            result.append(line)
    return result


def make_title_chunks(
    input_lines: list[str],
    title: str,
    chunk_size: int,
    *,
    kind: str = "section",
) -> list[CleanedChunk]:
    content = "\n".join(input_lines).strip()
    return [
        CleanedChunk(part, kind, {"title": title} if title else {})
        for part in split_long_text(content, chunk_size)
    ]


def looks_like_toc_entry(line: str) -> bool:
    return bool(re.search(r"(\.{2,}\s*\d+$|\s\d{1,4}$)", line)) or len(line) <= 40


def looks_like_table(text: str) -> bool:
    sample_lines = lines(text)
    return any("|" in line for line in sample_lines[:20]) or (
        len(sample_lines) > 1
        and ("\t" in sample_lines[0] or sample_lines[0].count(",") >= 2)
    )


def looks_like_qa(text: str) -> bool:
    sample_lines = lines(text)[:80]
    q_count = sum(1 for line in sample_lines if QA_Q_RE.match(line))
    a_count = sum(1 for line in sample_lines if QA_A_RE.match(line))
    return q_count > 0 and a_count > 0


def looks_like_paper(text: str) -> bool:
    head = "\n".join(lines(text)[:80]).lower()
    return bool(
        re.search(r"\babstract\b|摘要", head)
        and re.search(r"\bkeywords?\b|关键词|引言|introduction", head)
    )


def looks_like_law(text: str) -> bool:
    return sum(1 for line in lines(text)[:120] if LAW_HEADING_RE.match(line)) >= 2


def strip_qa_prefix(text: str) -> str:
    return re.sub(
        r"^(问题|答案|回答|user|assistant|Q|A|Question|Answer|问|答)[\t:： ]+",
        "",
        text.strip(),
        flags=re.IGNORECASE,
    )


def table_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]
