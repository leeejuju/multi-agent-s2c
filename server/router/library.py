from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from server.utils.auth import AuthenticatedUser

router = APIRouter(prefix="/libraries", tags=["libraries"])

LibraryStatus = Literal["draft", "review", "ready", "archived"]


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


DEMO_DRAWING_SCRIPTS: list[DrawingScriptItem] = [
    DrawingScriptItem(
        id="draw-script-night-market",
        title="Neon Alley Opening Sequence",
        project_name="Midnight Courier",
        shot_count=18,
        status="ready",
        style_tags=["neon noir", "rain", "handheld", "close-up"],
        updated_at="2026-05-14T06:30:00Z",
    ),
    DrawingScriptItem(
        id="draw-script-rooftop",
        title="Rooftop Signal Exchange",
        project_name="Midnight Courier",
        shot_count=12,
        status="review",
        style_tags=["wide lens", "silhouette", "wind", "blue hour"],
        updated_at="2026-05-13T21:10:00Z",
    ),
    DrawingScriptItem(
        id="draw-script-train",
        title="Last Train Memory Montage",
        project_name="Glass Station",
        shot_count=24,
        status="draft",
        style_tags=["montage", "reflection", "warm practicals", "slow push"],
        updated_at="2026-05-12T09:42:00Z",
    ),
]


DEMO_SCREENPLAYS: list[ScreenplayItem] = [
    ScreenplayItem(
        id="screenplay-midnight-courier",
        title="Midnight Courier",
        genre="Urban Mystery",
        status="ready",
        summary=(
            "A courier discovers that every package she delivers after midnight "
            "changes one detail from the recipient's past, forcing her to choose "
            "between repairing lives and preserving the truth."
        ),
        updated_at="2026-05-14T06:25:00Z",
        characters=[
            CharacterNode(
                id="maya",
                name="Maya Lin",
                role="Courier",
                archetype="Reluctant witness",
            ),
            CharacterNode(
                id="ren",
                name="Ren Vale",
                role="Archivist",
                archetype="Keeper of records",
            ),
            CharacterNode(
                id="ori",
                name="Ori Chen",
                role="Client",
                archetype="Unreliable patron",
            ),
            CharacterNode(
                id="sable",
                name="Sable",
                role="Antagonist",
                archetype="Memory broker",
            ),
        ],
        relationships=[
            CharacterRelationship(
                id="maya-ren",
                source_id="maya",
                target_id="ren",
                label="trust",
                strength=4,
            ),
            CharacterRelationship(
                id="maya-ori",
                source_id="maya",
                target_id="ori",
                label="contract",
                strength=3,
            ),
            CharacterRelationship(
                id="ren-sable",
                source_id="ren",
                target_id="sable",
                label="rivalry",
                strength=5,
            ),
            CharacterRelationship(
                id="ori-sable",
                source_id="ori",
                target_id="sable",
                label="debt",
                strength=4,
            ),
        ],
    ),
    ScreenplayItem(
        id="screenplay-glass-station",
        title="Glass Station",
        genre="Contained Sci-Fi Drama",
        status="review",
        summary=(
            "During a citywide evacuation, three strangers wait inside a sealed "
            "transit hub where the announcement system seems to know the futures "
            "they are trying to avoid."
        ),
        updated_at="2026-05-12T10:05:00Z",
        characters=[
            CharacterNode(
                id="iona",
                name="Iona Park",
                role="Engineer",
                archetype="Problem solver",
            ),
            CharacterNode(
                id="tomas",
                name="Tomas Reed",
                role="Teacher",
                archetype="Moral center",
            ),
            CharacterNode(
                id="vail",
                name="Vail",
                role="Station Voice",
                archetype="Hidden system",
            ),
        ],
        relationships=[
            CharacterRelationship(
                id="iona-tomas",
                source_id="iona",
                target_id="tomas",
                label="alliance",
                strength=4,
            ),
            CharacterRelationship(
                id="iona-vail",
                source_id="iona",
                target_id="vail",
                label="investigation",
                strength=5,
            ),
            CharacterRelationship(
                id="tomas-vail",
                source_id="tomas",
                target_id="vail",
                label="confession",
                strength=3,
            ),
        ],
    ),
]


@router.get("/drawing-scripts", response_model=list[DrawingScriptItem])
async def list_drawing_scripts(_current_user: AuthenticatedUser):
    return DEMO_DRAWING_SCRIPTS


@router.get("/screenplays", response_model=list[ScreenplayItem])
async def list_screenplays(_current_user: AuthenticatedUser):
    return DEMO_SCREENPLAYS
