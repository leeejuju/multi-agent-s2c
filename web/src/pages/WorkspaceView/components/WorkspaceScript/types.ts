import type { TElement, TText } from "platejs";
import type { TPlateEditor } from "platejs/react";

export const SCRIPT_ELEMENT_KINDS = [
  "scene",
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "beat",
  "transition",
] as const;

export type ScriptElementKind = (typeof SCRIPT_ELEMENT_KINDS)[number];

export const SCRIPT_TEXT_ELEMENT_KINDS = [
  "action",
  "parenthetical",
  "dialogue",
  "beat",
] as const;

export type ScriptTextElementKind =
  (typeof SCRIPT_TEXT_ELEMENT_KINDS)[number];

export const SCRIPT_SCENE_NODE_TYPE = "scene_heading";
export const SCRIPT_ACTION_NODE_TYPE = "action";
export const SCRIPT_CHARACTER_NODE_TYPE = "character";
export const SCRIPT_PARENTHETICAL_NODE_TYPE = "parenthetical";
export const SCRIPT_DIALOGUE_NODE_TYPE = "dialogue";
export const SCRIPT_BEAT_NODE_TYPE = "beat";
export const SCRIPT_TRANSITION_NODE_TYPE = "transition";

export const LEGACY_SCRIPT_NODE_TYPE_BY_KIND = {
  action: "scriptAction",
  beat: "scriptBeat",
  character: "scriptCharacter",
  dialogue: "scriptDialogue",
  parenthetical: "scriptParenthetical",
  scene: "scriptScene",
  transition: "scriptTransition",
} as const satisfies Record<ScriptElementKind, string>;

export const SCRIPT_NODE_TYPE_BY_KIND = {
  action: SCRIPT_ACTION_NODE_TYPE,
  beat: SCRIPT_BEAT_NODE_TYPE,
  character: SCRIPT_CHARACTER_NODE_TYPE,
  dialogue: SCRIPT_DIALOGUE_NODE_TYPE,
  parenthetical: SCRIPT_PARENTHETICAL_NODE_TYPE,
  scene: SCRIPT_SCENE_NODE_TYPE,
  transition: SCRIPT_TRANSITION_NODE_TYPE,
} as const satisfies Record<ScriptElementKind, string>;

export type ScriptNodeType =
  (typeof SCRIPT_NODE_TYPE_BY_KIND)[ScriptElementKind];

export const SCRIPT_NODE_TYPES = Object.values(
  SCRIPT_NODE_TYPE_BY_KIND,
) as ScriptNodeType[];

export const SCRIPT_TEXT_NODE_TYPES = [
  SCRIPT_ACTION_NODE_TYPE,
  SCRIPT_PARENTHETICAL_NODE_TYPE,
  SCRIPT_DIALOGUE_NODE_TYPE,
  SCRIPT_BEAT_NODE_TYPE,
] as const;

export type ScriptTextNodeType =
  (typeof SCRIPT_TEXT_NODE_TYPES)[number];

export const SCRIPT_AI_ACTIONS = [
  "chat",
  "polish",
  "condense",
  "enhance",
] as const;

export type ScriptAiAction = (typeof SCRIPT_AI_ACTIONS)[number];

export type ScriptAiRequest = {
  action: ScriptAiAction;
  selectedText: string;
};

export type SceneInterior = "interior" | "exterior" | "interior_exterior";
export type SceneTime = "day" | "night" | "dawn" | "dusk";

export type SceneDraft = {
  interior: SceneInterior | null;
  location: string;
  time: SceneTime | null;
};

export type SceneReference = SceneDraft & {
  interior: SceneInterior;
  key: string;
  time: SceneTime;
};

export const SCENE_INTERIOR_OPTIONS: ReadonlyArray<{
  label: string;
  value: SceneInterior;
}> = [
  { label: "内景", value: "interior" },
  { label: "外景", value: "exterior" },
  { label: "内/外景", value: "interior_exterior" },
];

export const SCENE_TIME_OPTIONS: ReadonlyArray<{
  label: string;
  value: SceneTime;
}> = [
  { label: "白天", value: "day" },
  { label: "黑夜", value: "night" },
  { label: "黎明", value: "dawn" },
  { label: "黄昏", value: "dusk" },
];

export const SCENE_INTERIOR_LABELS: Record<SceneInterior, string> = {
  exterior: "外景",
  interior: "内景",
  interior_exterior: "内/外景",
};

export const SCENE_TIME_LABELS: Record<SceneTime, string> = {
  dawn: "黎明",
  day: "白天",
  dusk: "黄昏",
  night: "黑夜",
};

export const SCENE_INTERIOR_SHORT_LABELS: Record<SceneInterior, string> = {
  exterior: "外",
  interior: "内",
  interior_exterior: "内/外",
};

export const SCENE_TIME_SHORT_LABELS: Record<SceneTime, string> = {
  dawn: "晨",
  day: "日",
  dusk: "昏",
  night: "夜",
};

export function formatSceneHeading(scene: SceneDraft) {
  const interior = scene.interior
    ? SCENE_INTERIOR_LABELS[scene.interior]
    : "内景/外景";
  const time = scene.time ? SCENE_TIME_LABELS[scene.time] : "时间";
  const location = scene.location.trim() || "场地";

  return `${interior}. ${location} — ${time}`;
}

export type ScriptPerson = {
  description?: string;
  id: string;
  name: string;
  role?: string;
  type: "people";
};

export type ScriptOrigin = "generated" | null;

export type ScriptText = TText & {
  text: string;
};

type ScriptElementBase = TElement & {
  children: ScriptText[];
  id: string;
  origin: ScriptOrigin;
};

export type ScriptActionElement = ScriptElementBase & {
  type: typeof SCRIPT_ACTION_NODE_TYPE;
};

export type ScriptParentheticalElement = ScriptElementBase & {
  type: typeof SCRIPT_PARENTHETICAL_NODE_TYPE;
};

export type ScriptDialogueElement = ScriptElementBase & {
  type: typeof SCRIPT_DIALOGUE_NODE_TYPE;
};

export type ScriptBeatElement = ScriptElementBase & {
  type: typeof SCRIPT_BEAT_NODE_TYPE;
};

export type ScriptTextElement =
  | ScriptActionElement
  | ScriptParentheticalElement
  | ScriptDialogueElement
  | ScriptBeatElement;

export type ScriptSceneElement = ScriptElementBase & {
  interior: SceneInterior | null;
  location: string;
  time: SceneTime | null;
  type: typeof SCRIPT_SCENE_NODE_TYPE;
};

export type ScriptCharacterElement = ScriptElementBase & {
  characterName: string;
  personId: string | null;
  type: typeof SCRIPT_CHARACTER_NODE_TYPE;
};

export type ScriptTransitionElement = ScriptElementBase & {
  transitionType: string;
  type: typeof SCRIPT_TRANSITION_NODE_TYPE;
};

export type ScriptElement =
  | ScriptTextElement
  | ScriptSceneElement
  | ScriptCharacterElement
  | ScriptTransitionElement;

export type ScriptDocument = ScriptElement[];
export type ScriptEditor = TPlateEditor<ScriptDocument>;

export type ScriptElementAttributes = {
  characterName?: string | null;
  id?: string | null;
  interior?: SceneInterior | null;
  location?: string | null;
  origin?: ScriptOrigin;
  personId?: string | null;
  time?: SceneTime | null;
  transitionType?: string | null;
};

export const SCRIPT_ELEMENT_LABELS: Record<ScriptElementKind, string> = {
  action: "动作",
  beat: "节拍",
  character: "角色",
  dialogue: "对白",
  parenthetical: "括注",
  scene: "场景",
  transition: "转场",
};

export const NEXT_SCRIPT_ELEMENT_KIND: Record<
  ScriptElementKind,
  ScriptElementKind
> = {
  action: "action",
  beat: "action",
  character: "parenthetical",
  dialogue: "character",
  parenthetical: "dialogue",
  scene: "action",
  transition: "scene",
};

export function getScriptNodeType(kind: ScriptElementKind): ScriptNodeType {
  return SCRIPT_NODE_TYPE_BY_KIND[kind];
}

export function getScriptElementKindFromType(
  type: ScriptNodeType,
): ScriptElementKind {
  const entry = Object.entries(SCRIPT_NODE_TYPE_BY_KIND).find(
    ([, nodeType]) => nodeType === type,
  );
  return entry![0] as ScriptElementKind;
}

export function getScriptElementKindFromUnknownType(
  type: unknown,
): ScriptElementKind | null {
  if (typeof type !== "string") return null;

  const currentEntry = Object.entries(SCRIPT_NODE_TYPE_BY_KIND).find(
    ([, nodeType]) => nodeType === type,
  );
  if (currentEntry) return currentEntry[0] as ScriptElementKind;

  const legacyEntry = Object.entries(LEGACY_SCRIPT_NODE_TYPE_BY_KIND).find(
    ([, nodeType]) => nodeType === type,
  );
  return legacyEntry ? (legacyEntry[0] as ScriptElementKind) : null;
}

export function isScriptNodeType(value: unknown): value is ScriptNodeType {
  return (
    typeof value === "string" &&
    (SCRIPT_NODE_TYPES as readonly string[]).includes(value)
  );
}

export function isScriptTextNodeType(
  value: unknown,
): value is ScriptTextNodeType {
  return (
    typeof value === "string" &&
    (SCRIPT_TEXT_NODE_TYPES as readonly string[]).includes(value)
  );
}

export function toSceneInterior(value: unknown): SceneInterior | null {
  return value === "interior" ||
    value === "exterior" ||
    value === "interior_exterior"
    ? value
    : null;
}

export function toSceneTime(value: unknown): SceneTime | null {
  return value === "day" ||
    value === "night" ||
    value === "dawn" ||
    value === "dusk"
    ? value
    : null;
}
