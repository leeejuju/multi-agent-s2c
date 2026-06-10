from collections import Counter
from pathlib import Path
from re import IGNORECASE, MULTILINE
from re import compile as compile_regex
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.auth import AuthenticatedUser
from src.database import get_db
from src.database.models import LibraryItem
from src.database.repositories import LibraryRepository
from src.plugins.document_parser import (
    DocumentParseRequest,
    DocumentParseResult,
    DocumentParserRunner,
)
from src.storage import (
    build_object_key,
    delete_object,
    upload_object_bytes,
)
from src.utils import logger

router = APIRouter(prefix="/libraries", tags=["libraries"])

LibraryStatus = Literal["draft", "review", "ready", "archived"]

MAX_IMPORT_FILES = 8
MAX_LIBRARY_DOCUMENT_SIZE = 35 * 1024 * 1024
MAX_PARSED_DOCUMENT_CHARS = 120_000
ALLOWED_LIBRARY_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
}
ALLOWED_LIBRARY_DOCUMENT_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".md",
    ".markdown",
}

speaker_line_pattern = compile_regex(
    r"^\s*([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9 _·.'-]{1,28})\s*[：:]\s*\S+",
    MULTILINE,
)
role_line_pattern = compile_regex(
    r"(?:角色|人物|Character|Characters)\s*[：:]\s*([^\n\r]+)",
    IGNORECASE,
)


class DrawingScriptItem(BaseModel):
    id: str
    title: str
    project_name: str
    shot_count: int
    status: LibraryStatus
    style_tags: list[str]
    updated_at: str
    cover_url: str | None = None


class CharacterNode(BaseModel):
    id: str
    name: str
    role: str
    archetype: str | None = None


class CharacterRelationship(BaseModel):
    id: str
    source_id: str
    target_id: str
    label: str
    strength: int = Field(ge=1, le=5)


class ScreenplayItem(BaseModel):
    id: str
    title: str
    genre: str
    status: LibraryStatus
    summary: str
    updated_at: str
    characters: list[CharacterNode]
    relationships: list[CharacterRelationship]
    source_file_name: str | None = None
    source_content_type: str | None = None
    source_file_size: int | None = None


def _file_extension(filename: str | None) -> str:
    return Path(filename or "").suffix.lower()


def _title_from_filename(filename: str | None) -> str:
    title = Path(filename or "Untitled screenplay").stem.strip()
    return title or "Untitled screenplay"


def _truncate_text(text: str) -> tuple[str, bool]:
    if len(text) <= MAX_PARSED_DOCUMENT_CHARS:
        return text, False
    return (
        text[:MAX_PARSED_DOCUMENT_CHARS]
        + "\n\n[Document content truncated by library importer.]",
        True,
    )


def _is_allowed_library_document(filename: str | None, content_type: str) -> bool:
    return (
        content_type in ALLOWED_LIBRARY_DOCUMENT_TYPES
        or _file_extension(filename) in ALLOWED_LIBRARY_DOCUMENT_EXTENSIONS
    )


async def _parse_library_document(
    *,
    file_name: str,
    content_type: str,
    content: bytes,
) -> dict[str, Any]:
    request = DocumentParseRequest(
        file_name=file_name,
        content_type=content_type,
        content=content,
        parser_name="docling",
    )
    runner = DocumentParserRunner(max_workers=1)
    events = []
    try:
        async for event in runner.parse(request):
            events.append(event)
    finally:
        await runner.aclose()

    result = DocumentParseResult.from_events(
        request=request,
        parser="docling",
        events=events,
    )
    parsed_text, truncated = _truncate_text((result.content or "").strip())
    warnings = [
        event.message for event in events if event.type == "warning" and event.message
    ]
    return {
        "parser": result.parser,
        "success": result.success,
        "error": result.error,
        "parsed_text": parsed_text,
        "metadata": {
            **dict(result.metadata),
            "event_count": len(events),
            "truncated": truncated,
            "warning_count": len(warnings),
            "warnings": warnings,
        },
    }


def _normalize_character_name(raw: str) -> str:
    return " ".join(raw.strip().strip("-—[]()（）").split())


def _extract_character_names(text: str, limit: int = 10) -> list[str]:
    counter: Counter[str] = Counter()
    for match in speaker_line_pattern.finditer(text):
        name = _normalize_character_name(match.group(1))
        if 1 < len(name) <= 28 and not name.lower().startswith(("scene", "int", "ext")):
            counter[name] += 1

    for match in role_line_pattern.finditer(text):
        for part in compile_regex(r"[,，、/|]").split(match.group(1)):
            name = _normalize_character_name(part)
            if 1 < len(name) <= 28:
                counter[name] += 2

    return [name for name, _ in counter.most_common(limit)]


def _character_id(name: str, index: int) -> str:
    safe = "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")
    return safe or f"character-{index + 1}"


def _build_character_graph(text: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    names = _extract_character_names(text)
    characters = [
        {
            "id": _character_id(name, index),
            "name": name,
            "role": "Character",
            "archetype": None,
        }
        for index, name in enumerate(names)
    ]
    id_by_name = {character["name"]: character["id"] for character in characters}
    if len(characters) < 2:
        return characters, []

    relationship_counter: Counter[tuple[str, str]] = Counter()
    recent_speakers: list[str] = []
    for match in speaker_line_pattern.finditer(text):
        name = _normalize_character_name(match.group(1))
        if name not in id_by_name:
            continue
        for previous in recent_speakers[-3:]:
            if previous == name:
                continue
            pair = tuple(sorted((id_by_name[previous], id_by_name[name])))
            relationship_counter[pair] += 1
        recent_speakers.append(name)

    relationships = []
    for index, ((source_id, target_id), count) in enumerate(
        relationship_counter.most_common(16)
    ):
        relationships.append(
            {
                "id": f"rel-{index + 1}-{source_id}-{target_id}",
                "source_id": source_id,
                "target_id": target_id,
                "label": "co-scene",
                "strength": max(1, min(5, count)),
            }
        )
    return characters, relationships


def _summary_from_text(text: str, fallback: str) -> str:
    compact_lines = [line.strip() for line in text.splitlines() if line.strip()]
    compact = " ".join(compact_lines)
    if not compact:
        return f"Imported screenplay document: {fallback}."
    return compact[:360]


def _screenplay_response(item: LibraryItem) -> ScreenplayItem:
    return ScreenplayItem(
        id=str(item.id),
        title=item.title,
        genre=item.genre or "Imported Script",
        status=item.status,  # type: ignore[arg-type]
        summary=item.summary,
        updated_at=item.updated_at.isoformat(),
        characters=[CharacterNode(**character) for character in item.characters],
        relationships=[
            CharacterRelationship(**relationship)
            for relationship in item.relationships
        ],
        source_file_name=item.source_file_name,
        source_content_type=item.source_content_type,
        source_file_size=item.source_file_size,
    )


def _drawing_script_response(item: LibraryItem) -> DrawingScriptItem:
    return DrawingScriptItem(
        id=str(item.id),
        title=item.title,
        project_name=item.project_name or item.title,
        shot_count=item.shot_count,
        status=item.status,  # type: ignore[arg-type]
        style_tags=list(item.style_tags or []),
        updated_at=item.updated_at.isoformat(),
        cover_url=item.cover_url,
    )


@router.get("/drawing-scripts", response_model=list[DrawingScriptItem])
async def list_drawing_scripts(
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
):
    items = await LibraryRepository(db).list_items(
        user_id=current_user.user_id,
        kind="drawing_script",
    )
    return [_drawing_script_response(item) for item in items]


@router.get("/screenplays", response_model=list[ScreenplayItem])
async def list_screenplays(
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
):
    items = await LibraryRepository(db).list_items(
        user_id=current_user.user_id,
        kind="screenplay",
    )
    return [_screenplay_response(item) for item in items]


@router.post("/screenplays/import", response_model=list[ScreenplayItem])
async def import_screenplays(
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
    files: list[UploadFile] = File(...),
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one screenplay document is required.",
        )
    if len(files) > MAX_IMPORT_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Import at most {MAX_IMPORT_FILES} documents at a time.",
        )

    repository = LibraryRepository(db)
    object_keys: list[str] = []
    imported_items: list[LibraryItem] = []

    try:
        for upload in files:
            content_type = (upload.content_type or "").lower()
            if not _is_allowed_library_document(upload.filename, content_type):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported library document type: {upload.filename or 'unknown'}.",
                )

            content = await upload.read()
            if not content:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Document '{upload.filename or 'unknown'}' is empty.",
                )
            if len(content) > MAX_LIBRARY_DOCUMENT_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Document '{upload.filename or 'unknown'}' exceeds the size limit.",
                )

            title = _title_from_filename(upload.filename)
            object_key = build_object_key(
                conversation_id=uuid4(),
                category="library",
                filename=upload.filename or "screenplay",
            )
            await upload_object_bytes(
                object_key,
                content,
                content_type or "application/octet-stream",
            )
            object_keys.append(object_key)

            parse_result = await _parse_library_document(
                file_name=upload.filename or "screenplay",
                content_type=content_type or "application/octet-stream",
                content=content,
            )
            parsed_text = parse_result["parsed_text"]
            characters, relationships = _build_character_graph(parsed_text)
            item = await repository.create_item(
                user_id=current_user.user_id,
                kind="screenplay",
                title=title,
                genre="Imported Script",
                status="draft",
                summary=_summary_from_text(parsed_text, title),
                content_text=parsed_text,
                source_file_name=upload.filename or "screenplay",
                source_content_type=content_type or "application/octet-stream",
                source_file_size=len(content),
                object_key=object_key,
                characters=characters,
                relationships=relationships,
                item_metadata=parse_result["metadata"]
                | {
                    "parser": parse_result["parser"],
                    "parse_success": parse_result["success"],
                    "parse_error": parse_result["error"],
                },
            )
            imported_items.append(item)

        await repository.commit()
    except Exception:
        await repository.rollback()
        for object_key in object_keys:
            try:
                await delete_object(object_key)
            except HTTPException:
                pass
        logger.exception("Library screenplay import failed for user_id=%s.", current_user.user_id)
        raise

    return [_screenplay_response(item) for item in imported_items]
