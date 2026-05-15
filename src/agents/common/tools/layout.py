from __future__ import annotations

from typing import Any

from langchain.tools import tool


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return [str(value)]


@tool
async def optimize_image_layout(
    brief: str,
    references: list[dict[str, Any]] | None = None,
    constraints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a structured composition plan and image-generation prompt."""

    constraints = constraints or {}
    references = references or []
    aspect_ratio = str(constraints.get("aspect_ratio") or "16:9")
    style = str(constraints.get("style") or "cinematic production frame")
    mood = str(constraints.get("mood") or "clear dramatic focus")
    must_include = _string_list(constraints.get("must_include"))
    avoid = _string_list(constraints.get("avoid"))

    reference_notes = [
        str(ref.get("title") or ref.get("content") or ref)[:180]
        for ref in references[:5]
    ]
    subject = brief.strip() or "the requested scene"

    return {
        "layout_plan": {
            "aspect_ratio": aspect_ratio,
            "primary_subject": subject,
            "composition": "Use a strong foreground subject, readable mid-ground action, and a simple background silhouette.",
            "camera": "Choose a camera height and lens that make the subject hierarchy immediately legible.",
            "lighting": "Separate the subject from the background with directional key light and controlled rim light.",
            "color": "Use one dominant palette, one contrast accent, and avoid noisy competing colors.",
            "must_include": must_include,
        },
        "generation_prompt": (
            f"{subject}, {style}, {mood}, aspect ratio {aspect_ratio}, "
            "clear visual hierarchy, intentional negative space, production design detail, "
            "balanced foreground mid-ground background, cinematic lighting"
        ),
        "negative_prompt": ", ".join(
            avoid
            or [
                "crowded composition",
                "unclear focal point",
                "extra limbs",
                "distorted faces",
                "low-resolution artifacts",
                "unreadable text",
            ]
        ),
        "composition_notes": [
            "Keep the main silhouette readable at thumbnail size.",
            "Group secondary elements by story priority instead of distributing them evenly.",
            "Reserve negative space for motion direction, dialogue area, or title-safe framing.",
        ],
        "canvas_node_suggestions": [
            {
                "type": "image",
                "title": "Composition reference",
                "width": 320,
                "height": 180,
            },
            {
                "type": "agent",
                "title": "Layout review",
                "subtitle": "Check focal hierarchy and prompt quality",
            },
        ],
        "reference_notes": reference_notes,
    }
