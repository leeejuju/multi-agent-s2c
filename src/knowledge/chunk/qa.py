from __future__ import annotations

from .common import (
    QA_A_RE,
    QA_Q_RE,
    heading_text,
    lines,
    markdown_heading_level,
    strip_qa_prefix,
)
from .types import CleanedChunk


def clean_qa(text: str, *, chunk_size: int) -> list[CleanedChunk]:
    chunks = clean_labeled_qa(text)
    if chunks:
        return chunks
    return clean_markdown_heading_qa(text)


def clean_labeled_qa(text: str) -> list[CleanedChunk]:
    chunks: list[CleanedChunk] = []
    question = ""
    answer: list[str] = []

    def flush() -> None:
        nonlocal question, answer
        if question and answer:
            chunks.append(
                CleanedChunk(
                    f"问题：{strip_qa_prefix(question)}\n回答：{strip_qa_prefix(' '.join(answer))}",
                    "qa",
                )
            )
        question = ""
        answer = []

    for line in lines(text):
        q_match = QA_Q_RE.match(line)
        a_match = QA_A_RE.match(line)
        if q_match:
            flush()
            question = q_match.group(1).strip()
            continue
        if a_match:
            answer = [a_match.group(1).strip()]
            continue
        if question:
            answer.append(line)

    flush()
    return chunks


def clean_markdown_heading_qa(text: str) -> list[CleanedChunk]:
    chunks: list[CleanedChunk] = []
    question_stack: list[str] = []
    level_stack: list[int] = []
    answer: list[str] = []

    def flush() -> None:
        nonlocal answer
        answer_text = "\n".join(answer).strip()
        if question_stack and answer_text:
            chunks.append(
                CleanedChunk(
                    f"问题：{'\n'.join(question_stack)}\n回答：{answer_text}",
                    "qa",
                )
            )
        answer = []

    for line in lines(text):
        level = markdown_heading_level(line)
        if not level:
            answer.append(line)
            continue
        flush()
        while level_stack and level <= level_stack[-1]:
            level_stack.pop()
            question_stack.pop()
        level_stack.append(level)
        question_stack.append(heading_text(line))

    flush()
    return chunks
