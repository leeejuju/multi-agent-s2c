import {
  NodeApi,
  PathApi,
  RangeApi,
  type Descendant,
  type Path,
  type PluginConfig,
} from "platejs";
import {
  PlateElement,
  ParagraphPlugin,
  createPlatePlugin,
  createTPlatePlugin,
  type PlateElementProps,
} from "platejs/react";

import CharacterLineEditor from "../components/CharacterLineEditor";
import SceneLineEditor from "../components/SceneLineEditor";
import TransitionLineEditor from "../components/TransitionLineEditor";
import {
  createScriptElement,
  getScriptElementKind,
  getScriptElementText,
  isScriptElement,
  isScriptTextElement,
  sanitizePastedScriptFragment,
} from "../scriptContent";
import {
  NEXT_SCRIPT_ELEMENT_KIND,
  SCRIPT_ACTION_NODE_TYPE,
  SCRIPT_BEAT_NODE_TYPE,
  SCRIPT_CHARACTER_NODE_TYPE,
  SCRIPT_DIALOGUE_NODE_TYPE,
  SCRIPT_ELEMENT_KINDS,
  SCRIPT_ELEMENT_LABELS,
  SCRIPT_PARENTHETICAL_NODE_TYPE,
  SCRIPT_SCENE_NODE_TYPE,
  SCRIPT_TRANSITION_NODE_TYPE,
  getScriptNodeType,
  toSceneInterior,
  toSceneTime,
  type SceneDraft,
  type SceneReference,
  type ScriptCharacterElement,
  type ScriptDocument,
  type ScriptEditor,
  type ScriptElement,
  type ScriptElementAttributes,
  type ScriptElementKind,
  type ScriptPerson,
  type ScriptSceneElement,
  type ScriptTextElement,
  type ScriptTransitionElement,
} from "../types";
import {
  getScriptNodePathKey,
  openScriptNodeSelector,
} from "./scriptNodeEvents";

import "./ScriptNodes.css";

const TEXT_LINE_PLACEHOLDERS: Record<string, string> = {
  action: "描述动作、环境或画面",
  beat: "描述节奏或停顿",
  dialogue: "输入台词",
  parenthetical: "表演提示",
};

function getAdjacentScriptKind(
  kind: ScriptElementKind,
  reverse: boolean,
) {
  const index = SCRIPT_ELEMENT_KINDS.indexOf(kind);
  const offset = reverse ? -1 : 1;
  return SCRIPT_ELEMENT_KINDS[
    (index + offset + SCRIPT_ELEMENT_KINDS.length) %
      SCRIPT_ELEMENT_KINDS.length
  ];
}

type ScriptCharacterOptions = {
  getPeople: () => ScriptPerson[];
  onCreatePerson: (name: string) => ScriptPerson;
};

type ScriptCharacterConfig = PluginConfig<
  typeof SCRIPT_CHARACTER_NODE_TYPE,
  ScriptCharacterOptions
>;

function getCurrentScriptEntry(
  editor: ScriptEditor,
): [ScriptElement, Path] | null {
  const selection = editor.selection;
  if (!selection) return null;

  const index = selection.anchor.path[0];
  const element = editor.children[index];
  return isScriptElement(element) ? [element, [index]] : null;
}

function isCommittedScriptElement(element: ScriptElement) {
  const kind = getScriptElementKind(element);

  if (kind === "scene" && element.type === SCRIPT_SCENE_NODE_TYPE) {
    return Boolean(
      element.interior && element.location.trim() && element.time,
    );
  }
  if (
    kind === "character" &&
    element.type === SCRIPT_CHARACTER_NODE_TYPE
  ) {
    return Boolean(element.personId || element.characterName.trim());
  }
  if (
    kind === "transition" &&
    element.type === SCRIPT_TRANSITION_NODE_TYPE
  ) {
    return Boolean(element.transitionType.trim());
  }
  return Boolean(getScriptElementText(element).trim());
}

function selectScriptElement(editor: ScriptEditor, path: Path) {
  editor.tf.select(path, { edge: "start" });
}

function focusScriptElement(
  editor: ScriptEditor,
  path: Path,
  kind?: ScriptElementKind,
) {
  editor.tf.focus({ at: path, edge: "start" });
  if (kind) openScriptNodeSelector(kind, path);
}

function getLivePath(
  editor: ScriptEditor,
  element: ScriptElement,
  fallback: Path,
) {
  return editor.api.findPath(element) ?? fallback;
}

function replaceScriptElementsAt(
  editor: ScriptEditor,
  path: Path,
  elements: ScriptElement[],
) {
  editor.tf.replaceNodes(elements, { at: path });
  const targetPath = [path[0] + elements.length - 1];
  focusScriptElement(
    editor,
    targetPath,
    getScriptElementKind(elements[elements.length - 1]),
  );
  return true;
}

function insertScriptElementsAt(
  editor: ScriptEditor,
  path: Path,
  elements: ScriptElement[],
) {
  editor.tf.insertNodes(elements, { at: path });
  const targetPath = [path[0] + elements.length - 1];
  focusScriptElement(
    editor,
    targetPath,
    getScriptElementKind(elements[elements.length - 1]),
  );
  return true;
}

function advanceToScriptKind(
  editor: ScriptEditor,
  currentPath: Path,
  nextKind: ScriptElementKind,
) {
  const nextPath = PathApi.next(currentPath);
  const nextElement = editor.children[nextPath[0]];

  if (
    !isScriptElement(nextElement) ||
    getScriptElementKind(nextElement) !== nextKind
  ) {
    editor.tf.insertNodes(createScriptElement(nextKind), {
      at: nextPath,
    });
  }

  focusScriptElement(editor, nextPath, nextKind);
  return true;
}

function moveBackwardToScriptKind(
  editor: ScriptEditor,
  currentPath: Path,
  previousKind: ScriptElementKind,
) {
  const previousIndex = currentPath[0] - 1;
  const previousElement = editor.children[previousIndex];
  if (
    previousIndex >= 0 &&
    isScriptElement(previousElement) &&
    getScriptElementKind(previousElement) === previousKind
  ) {
    focusScriptElement(editor, [previousIndex], previousKind);
    return true;
  }

  editor.tf.insertNodes(createScriptElement(previousKind), {
    at: currentPath,
  });
  focusScriptElement(editor, currentPath, previousKind);
  return true;
}

function updateScriptElementAt(
  editor: ScriptEditor,
  path: Path,
  attributes: Partial<ScriptElement>,
) {
  editor.tf.setNodes(attributes, { at: path, voids: true });
}

function commitElementAndAdvance(
  editor: ScriptEditor,
  element: ScriptElement,
  fallbackPath: Path,
  attributes: Partial<ScriptElement>,
  nextKind: ScriptElementKind,
) {
  const path = getLivePath(editor, element, fallbackPath);
  updateScriptElementAt(editor, path, attributes);
  advanceToScriptKind(editor, path, nextKind);
}

function replaceElementKind(
  editor: ScriptEditor,
  element: ScriptElement,
  fallbackPath: Path,
  kind: ScriptElementKind,
) {
  const path = getLivePath(editor, element, fallbackPath);
  return replaceScriptElementsAt(editor, path, [
    createScriptElement(kind, "", {
      id: element.id,
      origin: element.origin,
    }),
  ]);
}

function handleTextElementTab(
  editor: ScriptEditor,
  element: ScriptTextElement,
  path: Path,
  reverse: boolean,
) {
  const text = NodeApi.string(element);
  const kind = getScriptElementKind(element);
  const nextKind = getAdjacentScriptKind(kind, reverse);

  if (text.trim()) {
    return insertScriptElementsAt(editor, PathApi.next(path), [
      createScriptElement(nextKind),
    ]);
  }

  return replaceScriptElementsAt(editor, path, [
    createScriptElement(nextKind, "", {
      id: element.id,
      origin: element.origin,
    }),
  ]);
}

function handleVoidElementTab(
  editor: ScriptEditor,
  element: Exclude<ScriptElement, ScriptTextElement>,
  path: Path,
  reverse: boolean,
) {
  const nextKind = getAdjacentScriptKind(
    getScriptElementKind(element),
    reverse,
  );

  if (isCommittedScriptElement(element)) {
    return reverse
      ? moveBackwardToScriptKind(editor, path, nextKind)
      : advanceToScriptKind(editor, path, nextKind);
  }

  return replaceScriptElementsAt(editor, path, [
    createScriptElement(nextKind, "", {
      id: element.id,
      origin: element.origin,
    }),
  ]);
}

function handleScriptTab(editor: ScriptEditor, reverse: boolean) {
  if (
    editor.api.isComposing() ||
    !editor.selection ||
    !RangeApi.isCollapsed(editor.selection)
  ) {
    return false;
  }

  const entry = getCurrentScriptEntry(editor);
  if (!entry) return false;
  const [element, path] = entry;

  return isScriptTextElement(element)
    ? handleTextElementTab(editor, element, path, reverse)
    : handleVoidElementTab(editor, element, path, reverse);
}

function handleScriptBreak(
  editor: ScriptEditor,
  insertBreak: () => void,
) {
  if (editor.selection && !RangeApi.isCollapsed(editor.selection)) {
    insertBreak();
    return;
  }

  const entry = getCurrentScriptEntry(editor);
  if (!entry) {
    insertBreak();
    return;
  }

  const [element, path] = entry;
  if (!isScriptTextElement(element)) {
    advanceToScriptKind(
      editor,
      path,
      NEXT_SCRIPT_ELEMENT_KIND[getScriptElementKind(element)],
    );
    return;
  }

  const kind = getScriptElementKind(element);
  if (kind === "dialogue" && editor.api.isAt({ end: true })) {
    advanceToScriptKind(editor, path, "character");
    return;
  }

  insertBreak();
  const nextPath = PathApi.next(path);
  const nextKind =
    kind === "dialogue"
      ? "dialogue"
      : NEXT_SCRIPT_ELEMENT_KIND[kind];
  editor.tf.setNodes(
    {
      origin: element.origin,
      type: getScriptNodeType(nextKind),
    } as Partial<ScriptElement>,
    { at: nextPath },
  );
}

export function getActiveScriptElementKind(editor: ScriptEditor) {
  const entry = getCurrentScriptEntry(editor);
  return entry ? getScriptElementKind(entry[0]) : "action";
}

export function activateScriptElement(
  editor: ScriptEditor,
  kind: ScriptElementKind,
  text = "",
  attributes: ScriptElementAttributes = {},
  nextKind?: ScriptElementKind,
) {
  const current = getCurrentScriptEntry(editor);
  const firstElement = createScriptElement(kind, text, attributes);
  const elements = nextKind
    ? [firstElement, createScriptElement(nextKind)]
    : [firstElement];

  if (current && !isCommittedScriptElement(current[0])) {
    elements[0] = createScriptElement(kind, text, {
      id: current[0].id,
      origin: current[0].origin,
      ...attributes,
    });
    return replaceScriptElementsAt(editor, current[1], elements);
  }

  const path = current
    ? PathApi.next(current[1])
    : [editor.children.length];
  return insertScriptElementsAt(editor, path, elements);
}

export function collectSceneReferences(
  value: ScriptDocument,
  excludeLineId?: string | null,
) {
  const scenes: SceneReference[] = [];
  const seen = new Set<string>();

  value.forEach((element) => {
    if (
      element.type !== SCRIPT_SCENE_NODE_TYPE ||
      (excludeLineId && element.id === excludeLineId)
    ) {
      return;
    }

    const interior = toSceneInterior(element.interior);
    const location = element.location.trim();
    const time = toSceneTime(element.time);
    if (!interior || !location || !time) return;

    const key = JSON.stringify([
      interior,
      location.toLocaleLowerCase(),
      time,
    ]);
    if (seen.has(key)) return;

    seen.add(key);
    scenes.push({ interior, key, location, time });
  });

  return scenes;
}

function TextScriptElement(
  props: PlateElementProps<ScriptTextElement>,
) {
  const { children, element } = props;
  const kind = getScriptElementKind(element);
  const placeholder = TEXT_LINE_PLACEHOLDERS[kind] ?? "输入内容";
  const empty = !NodeApi.string(element);

  return (
    <PlateElement
      {...props}
      attributes={{
        ...props.attributes,
        "data-block-id": element.id,
        "data-kind": kind,
      }}
      className="screenplay-line"
    >
      {kind === "parenthetical" ? (
        <div className="screenplay-parenthetical-line">
          <span aria-hidden="true" contentEditable={false}>(</span>
          <div
            aria-placeholder={placeholder}
            className="screenplay-line-content"
            data-empty={empty}
            data-placeholder={placeholder}
          >
            {children}
          </div>
          <span aria-hidden="true" contentEditable={false}>)</span>
        </div>
      ) : kind === "beat" ? (
        <div className="screenplay-marked-line" data-kind={kind}>
          <span
            className="screenplay-line-marker"
            contentEditable={false}
          >
            {SCRIPT_ELEMENT_LABELS[kind]}
          </span>
          <div
            aria-placeholder={placeholder}
            className="screenplay-line-content"
            data-empty={empty}
            data-placeholder={placeholder}
          >
            {children}
          </div>
        </div>
      ) : (
        <div
          aria-placeholder={placeholder}
          className="screenplay-line-content"
          data-empty={empty}
          data-placeholder={placeholder}
        >
          {children}
        </div>
      )}
    </PlateElement>
  );
}

function SceneScriptElement(
  props: PlateElementProps<ScriptSceneElement>,
) {
  const { children, editor: plateEditor, element, path } = props;
  const editor = plateEditor as ScriptEditor;
  const scene: SceneDraft = {
    interior: toSceneInterior(element.interior),
    location: element.location,
    time: toSceneTime(element.time),
  };
  const sceneNumber = editor.children
    .slice(0, path[0] + 1)
    .filter((item) => item.type === SCRIPT_SCENE_NODE_TYPE).length;

  return (
    <PlateElement
      {...props}
      attributes={{
        ...props.attributes,
        "data-block-id": element.id,
        "data-kind": "scene",
        "data-scene-id": element.id,
      }}
      className="screenplay-line screenplay-field-line screenplay-scene-heading"
    >
      <span aria-hidden="true" className="screenplay-void-children">
        {children}
      </span>
      <SceneLineEditor
        activationPath={getScriptNodePathKey(path)}
        getScenes={() =>
          collectSceneReferences(editor.children, element.id)
        }
        onActivate={() =>
          selectScriptElement(
            editor,
            getLivePath(editor, element, path),
          )
        }
        onChange={(nextScene) =>
          updateScriptElementAt(
            editor,
            getLivePath(editor, element, path),
            nextScene as Partial<ScriptElement>,
          )
        }
        onCommit={(nextScene) => {
          if (!nextScene.location.trim()) {
            replaceElementKind(editor, element, path, "action");
            return;
          }
          commitElementAndAdvance(
            editor,
            element,
            path,
            nextScene as Partial<ScriptElement>,
            "action",
          );
        }}
        onExit={(direction) => {
          const livePath = getLivePath(editor, element, path);
          if (direction === 1) {
            if (element.location.trim()) {
              advanceToScriptKind(editor, livePath, "action");
            } else {
              replaceElementKind(editor, element, path, "action");
            }
            return;
          }
          if (isCommittedScriptElement(element)) {
            moveBackwardToScriptKind(editor, livePath, "transition");
            return;
          }
          replaceElementKind(
            editor,
            element,
            path,
            "transition",
          );
        }}
        scene={scene}
        sceneNumber={Math.max(sceneNumber, 1)}
      />
    </PlateElement>
  );
}

function CharacterScriptElement(
  props: PlateElementProps<ScriptCharacterElement, ScriptCharacterConfig>,
) {
  const {
    children,
    editor: plateEditor,
    element,
    getOptions,
    path,
  } = props;
  const editor = plateEditor as ScriptEditor;
  const { getPeople, onCreatePerson } = getOptions();
  const resolvedName = element.personId
    ? getPeople().find((person) => person.id === element.personId)?.name
    : undefined;
  const characterName = resolvedName ?? element.characterName;

  return (
    <PlateElement
      {...props}
      attributes={{
        ...props.attributes,
        "data-block-id": element.id,
        "data-kind": "character",
      }}
      className="screenplay-line screenplay-field-line"
    >
      <span aria-hidden="true" className="screenplay-void-children">
        {children}
      </span>
      <CharacterLineEditor
        activationPath={getScriptNodePathKey(path)}
        characterName={characterName}
        getPeople={getPeople}
        onActivate={() =>
          selectScriptElement(
            editor,
            getLivePath(editor, element, path),
          )
        }
        onChoose={(person) =>
          commitElementAndAdvance(
            editor,
            element,
            path,
            {
              characterName: person.name,
              personId: person.id,
            } as Partial<ScriptElement>,
            "dialogue",
          )
        }
        onCreate={onCreatePerson}
        onTab={(direction) =>
          handleVoidElementTab(
            editor,
            element,
            getLivePath(editor, element, path),
            direction === -1,
          )
        }
      />
    </PlateElement>
  );
}

function TransitionScriptElement(
  props: PlateElementProps<ScriptTransitionElement>,
) {
  const { children, editor: plateEditor, element, path } = props;
  const editor = plateEditor as ScriptEditor;

  return (
    <PlateElement
      {...props}
      attributes={{
        ...props.attributes,
        "data-block-id": element.id,
        "data-kind": "transition",
      }}
      className="screenplay-line screenplay-field-line screenplay-marked-line"
    >
      <span aria-hidden="true" className="screenplay-void-children">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="screenplay-line-marker"
        contentEditable={false}
      >
        转场
      </span>
      <TransitionLineEditor
        activationPath={getScriptNodePathKey(path)}
        onActivate={() =>
          selectScriptElement(
            editor,
            getLivePath(editor, element, path),
          )
        }
        onChoose={(value) =>
          commitElementAndAdvance(
            editor,
            element,
            path,
            { transitionType: value } as Partial<ScriptElement>,
            "scene",
          )
        }
        onTab={(direction) =>
          handleVoidElementTab(
            editor,
            element,
            getLivePath(editor, element, path),
            direction === -1,
          )
        }
        value={element.transitionType}
      />
    </PlateElement>
  );
}

export const ScriptBehaviorPlugin = createPlatePlugin({
  handlers: {
    onKeyDown: ({ editor: plateEditor, event }) => {
      if (event.defaultPrevented || event.key !== "Tab") return false;

      const editor = plateEditor as ScriptEditor;
      if (!handleScriptTab(editor, event.shiftKey)) return false;

      event.preventDefault();
      event.stopPropagation();
      return true;
    },
  },
  key: "scriptBehavior",
  priority: 1000,
}).overrideEditor(({
  editor: plateEditor,
  tf: { insertBreak, insertFragment },
}) => ({
  transforms: {
    insertBreak: () =>
      handleScriptBreak(plateEditor as ScriptEditor, insertBreak),
    insertFragment: (fragment: Descendant[], options) =>
      insertFragment(sanitizePastedScriptFragment(fragment), options),
  },
}));

export const ScriptActionPlugin = ParagraphPlugin.configure({
  node: {
    isElement: true,
    type: SCRIPT_ACTION_NODE_TYPE,
  },
}).withComponent(TextScriptElement);

export const ScriptParentheticalPlugin = createPlatePlugin({
  key: SCRIPT_PARENTHETICAL_NODE_TYPE,
  node: { isElement: true },
}).withComponent(TextScriptElement);

export const ScriptDialoguePlugin = createPlatePlugin({
  key: SCRIPT_DIALOGUE_NODE_TYPE,
  node: { isElement: true },
}).withComponent(TextScriptElement);

export const ScriptBeatPlugin = createPlatePlugin({
  key: SCRIPT_BEAT_NODE_TYPE,
  node: { isElement: true },
}).withComponent(TextScriptElement);

export const ScriptScenePlugin = createPlatePlugin({
  key: SCRIPT_SCENE_NODE_TYPE,
  node: { isElement: true, isVoid: true },
}).withComponent(SceneScriptElement);

export const ScriptCharacterPlugin =
  createTPlatePlugin<ScriptCharacterConfig>({
    key: SCRIPT_CHARACTER_NODE_TYPE,
    node: { isElement: true, isVoid: true },
    options: {
      getPeople: () => [],
      onCreatePerson: (name) => ({
        id: crypto.randomUUID(),
        name,
        type: "people",
      }),
    },
  }).withComponent(CharacterScriptElement);

export const ScriptTransitionPlugin = createPlatePlugin({
  key: SCRIPT_TRANSITION_NODE_TYPE,
  node: { isElement: true, isVoid: true },
}).withComponent(TransitionScriptElement);
