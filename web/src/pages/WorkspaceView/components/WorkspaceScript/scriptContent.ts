import {
  NodeApi,
  RangeApi,
  type Descendant,
  type TRange,
} from "platejs";

import {
  SCRIPT_CHARACTER_NODE_TYPE,
  SCRIPT_NODE_TYPES,
  SCRIPT_SCENE_NODE_TYPE,
  SCRIPT_TRANSITION_NODE_TYPE,
  formatSceneHeading,
  getScriptElementKindFromType,
  getScriptElementKindFromUnknownType,
  getScriptNodeType,
  isScriptNodeType,
  isScriptTextNodeType,
  toSceneInterior,
  toSceneTime,
  type ScriptDocument,
  type ScriptEditor,
  type ScriptElement,
  type ScriptElementAttributes,
  type ScriptElementKind,
  type ScriptOrigin,
  type ScriptText,
  type ScriptTextElement,
} from "./types";

const GENERATED_LINE_ID_PREFIX = "generated-script-content";
const SCRIPT_NODE_TYPE_SET = new Set<string>(SCRIPT_NODE_TYPES);

type InitialScriptDocument = {
  document: ScriptDocument;
  generatedSnapshot: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function splitTextIntoLines(value: string) {
  return value.replace(/\r\n?/g, "\n").split("\n");
}

function createLineId() {
  return crypto.randomUUID();
}

function normalizeOrigin(value: unknown): ScriptOrigin {
  return value === "generated" ? "generated" : null;
}

function normalizeTextChildren(value: unknown): ScriptText[] {
  if (!Array.isArray(value)) return [{ text: "" }];

  const children = value.flatMap((child) =>
    isRecord(child) && typeof child.text === "string"
      ? [structuredClone(child) as ScriptText]
      : [],
  );
  return children.length ? children : [{ text: "" }];
}

export function createScriptElement(
  kind: ScriptElementKind,
  text = "",
  attributes: ScriptElementAttributes = {},
): ScriptElement {
  const common = {
    children: [{ text: "" }],
    id: attributes.id?.trim() || createLineId(),
    origin: attributes.origin ?? null,
  };

  if (kind === "scene") {
    return {
      ...common,
      interior: attributes.interior ?? null,
      location: attributes.location ?? text,
      time: attributes.time ?? null,
      type: SCRIPT_SCENE_NODE_TYPE,
    };
  }
  if (kind === "character") {
    return {
      ...common,
      characterName: attributes.characterName ?? text,
      personId: attributes.personId ?? null,
      type: SCRIPT_CHARACTER_NODE_TYPE,
    };
  }
  if (kind === "transition") {
    return {
      ...common,
      transitionType: attributes.transitionType ?? text,
      type: SCRIPT_TRANSITION_NODE_TYPE,
    };
  }

  return {
    ...common,
    children: [{ text }],
    type: getScriptNodeType(kind),
  } as ScriptTextElement;
}

export function isScriptElement(value: unknown): value is ScriptElement {
  return (
    isRecord(value) &&
    isScriptNodeType(value.type) &&
    Array.isArray(value.children)
  );
}

export function isScriptTextElement(
  value: unknown,
): value is ScriptTextElement {
  return isScriptElement(value) && isScriptTextNodeType(value.type);
}

export function getScriptElementKind(
  element: ScriptElement,
): ScriptElementKind {
  return getScriptElementKindFromType(element.type);
}

export function getScriptElementText(element: ScriptElement) {
  if (element.type === SCRIPT_SCENE_NODE_TYPE) {
    return formatSceneHeading(element);
  }
  if (element.type === SCRIPT_CHARACTER_NODE_TYPE) {
    return element.characterName;
  }
  if (element.type === SCRIPT_TRANSITION_NODE_TYPE) {
    return element.transitionType;
  }
  return NodeApi.string(element);
}

function createUniqueIdResolver() {
  const seen = new Set<string>();

  return (value: unknown) => {
    const candidate = typeof value === "string" ? value.trim() : "";
    if (candidate && !seen.has(candidate)) {
      seen.add(candidate);
      return candidate;
    }

    let id = createLineId();
    while (seen.has(id)) id = createLineId();
    seen.add(id);
    return id;
  };
}

function normalizeScriptNode(
  value: unknown,
  resolveId: (value: unknown) => string,
): ScriptElement | null {
  if (!isRecord(value) || !Array.isArray(value.children)) return null;

  const kind = getScriptElementKindFromUnknownType(value.type);
  if (!kind) return null;

  const id = resolveId(value.id);
  const origin = normalizeOrigin(value.origin);

  if (kind === "scene") {
    return createScriptElement("scene", "", {
      id,
      interior: toSceneInterior(value.interior),
      location: typeof value.location === "string" ? value.location : "",
      origin,
      time: toSceneTime(value.time),
    });
  }
  if (kind === "character") {
    return createScriptElement("character", "", {
      characterName:
        typeof value.characterName === "string" ? value.characterName : "",
      id,
      origin,
      personId: typeof value.personId === "string" ? value.personId : null,
    });
  }
  if (kind === "transition") {
    return createScriptElement("transition", "", {
      id,
      origin,
      transitionType:
        typeof value.transitionType === "string"
          ? value.transitionType
          : "",
    });
  }

  return {
    ...createScriptElement(kind, "", { id, origin }),
    children: normalizeTextChildren(value.children),
  } as ScriptTextElement;
}

export function normalizeScriptDocument(
  document: ScriptDocument,
): ScriptDocument {
  const resolveId = createUniqueIdResolver();
  const content = document.flatMap((node) => {
    const normalized = normalizeScriptNode(node, resolveId);
    return normalized ? [normalized] : [];
  });

  if (!content.length) content.push(createScriptElement("action"));
  return content;
}

function createGeneratedLines(
  value: string,
  existing: ScriptElement[] = [],
) {
  return splitTextIntoLines(value).map((line, index) =>
    createScriptElement("action", line, {
      id:
        existing[index]?.id ??
        (existing.length ? createLineId() : `${GENERATED_LINE_ID_PREFIX}-${index}`),
      origin: "generated",
    }),
  );
}

function describeGeneratedElements(value: ScriptDocument) {
  return JSON.stringify(
    value
      .filter((element) => element.origin === "generated")
      .map((element) => {
        const snapshot = structuredClone(element) as UnknownRecord;
        delete snapshot.id;
        delete snapshot.origin;
        return snapshot;
      }),
  );
}

export function getGeneratedJsonSnapshot(document: ScriptDocument) {
  return describeGeneratedElements(normalizeScriptDocument(document));
}

export function createInitialScriptDocument(
  initialContent: string,
  generatedContent: string,
): InitialScriptDocument {
  const initialLines = initialContent
    ? splitTextIntoLines(initialContent).map((line) =>
        createScriptElement("action", line),
      )
    : [];
  const generatedLines =
    generatedContent || !initialContent
      ? createGeneratedLines(generatedContent)
      : [];
  const document = [...initialLines, ...generatedLines];

  if (!document.length) document.push(createScriptElement("action"));

  return {
    document,
    generatedSnapshot: describeGeneratedElements(generatedLines),
  };
}

export function getGeneratedScriptSnapshot(value: ScriptDocument) {
  return describeGeneratedElements(value);
}

export function hasDiscontinuousGeneratedContent(
  value: ScriptDocument,
) {
  const generatedIndices = value.flatMap((element, index) =>
    element.origin === "generated" ? [index] : [],
  );
  if (generatedIndices.length < 2) return false;

  const firstIndex = generatedIndices[0];
  const lastIndex = generatedIndices[generatedIndices.length - 1];
  return lastIndex - firstIndex + 1 !== generatedIndices.length;
}

export function syncGeneratedScriptContent(
  editor: ScriptEditor,
  content: string,
) {
  const current = editor.children as ScriptDocument;
  if (hasDiscontinuousGeneratedContent(current)) {
    return getGeneratedScriptSnapshot(current);
  }

  const generated = current.filter(
    (element) => element.origin === "generated",
  );

  if (!generated.length && !content) {
    return getGeneratedScriptSnapshot(current);
  }

  const nextGenerated = createGeneratedLines(content, generated);
  const nextSnapshot = describeGeneratedElements(nextGenerated);
  if (getGeneratedScriptSnapshot(current) === nextSnapshot) {
    return nextSnapshot;
  }

  const firstGeneratedIndex = current.findIndex(
    (element) => element.origin === "generated",
  );
  const insertionIndex =
    firstGeneratedIndex < 0
      ? current.length
      : current
          .slice(0, firstGeneratedIndex)
          .filter((element) => element.origin !== "generated").length;
  const nextValue = current.filter(
    (element) => element.origin !== "generated",
  );
  nextValue.splice(insertionIndex, 0, ...nextGenerated);

  editor.tf.withoutSaving(() => editor.tf.setValue(nextValue));
  return nextSnapshot;
}

function getPointOffset(
  element: ScriptTextElement,
  point: TRange["anchor"],
) {
  const leafIndex = point.path[1] ?? 0;
  const precedingLength = element.children
    .slice(0, leafIndex)
    .reduce((total, leaf) => total + String(leaf.text).length, 0);
  return precedingLength + point.offset;
}

export function getSelectedScriptText(
  editor: ScriptEditor,
  selection: TRange | null = editor.selection,
) {
  if (!selection || RangeApi.isCollapsed(selection)) return "";

  const [start, end] = RangeApi.edges(selection);
  const startIndex = start.path[0];
  const endIndex = end.path[0];
  const lines: string[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const element = editor.children[index] as ScriptElement | undefined;
    if (!element) continue;

    let text = getScriptElementText(element);
    if (isScriptTextElement(element)) {
      const from = index === startIndex ? getPointOffset(element, start) : 0;
      const to =
        index === endIndex ? getPointOffset(element, end) : text.length;
      text = text.slice(from, to);
    }
    if (text) lines.push(text);
  }

  return lines.join("\n").trim();
}

function sanitizePastedNode(node: Descendant): Descendant {
  if (!isRecord(node)) return node;

  const children = Array.isArray(node.children)
    ? node.children.map((child) => sanitizePastedNode(child as Descendant))
    : undefined;
  if (
    typeof node.type === "string" &&
    SCRIPT_NODE_TYPE_SET.has(node.type)
  ) {
    return {
      ...node,
      ...(children ? { children } : {}),
      id: createLineId(),
      origin: null,
    } as Descendant;
  }

  return {
    ...node,
    ...(children ? { children } : {}),
  } as Descendant;
}

export function sanitizePastedScriptFragment(fragment: Descendant[]) {
  return fragment.map(sanitizePastedNode);
}
