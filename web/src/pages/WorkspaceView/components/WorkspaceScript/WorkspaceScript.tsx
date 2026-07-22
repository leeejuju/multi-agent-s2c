import { useEffect, useMemo, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { ScrollArea } from "radix-ui";

import type { Character } from "@/data/studio";

import ScriptAiToolbar from "./components/ScriptAiToolbar";
import { ScriptLineDndPlugin } from "./components/ScriptLineDraggable";
import ScriptToolbar from "./components/ScriptToolbar";
import "./WorkspaceScript.css";
import {
  ScriptActionPlugin,
  ScriptBeatPlugin,
  ScriptBehaviorPlugin,
  ScriptCharacterPlugin,
  ScriptDialoguePlugin,
  ScriptParentheticalPlugin,
  ScriptScenePlugin,
  ScriptTransitionPlugin,
  activateScriptElement,
  getActiveScriptElementKind,
} from "./extensions/ScriptNodes";
import {
  createInitialScriptDocument,
  getGeneratedJsonSnapshot,
  getGeneratedScriptSnapshot,
  hasDiscontinuousGeneratedContent,
  normalizeScriptDocument,
  syncGeneratedScriptContent,
} from "./scriptContent";
import {
  type ScriptAiRequest,
  type ScriptDocument,
  type ScriptElementKind,
  type ScriptPerson,
} from "./types";

type WorkspaceScriptProps = {
  characters?: Character[];
  generatedContent: string;
  generatedContentEdited?: boolean;
  initialContent: string;
  initialDocument?: ScriptDocument | null;
  onAiAction: (request: ScriptAiRequest) => void;
  onDocumentChange?: (document: ScriptDocument) => void;
  onGeneratedContentEditedChange?: (edited: boolean) => void;
};

function createInitialPeople(characters: Character[]) {
  return characters.map<ScriptPerson>((character) => ({
    description: character.description,
    id: character.id,
    name: character.name,
    role: character.role,
    type: "people",
  }));
}

const SCRIPT_ELEMENT_SHORTCUTS: Record<
  string,
  { kind: ScriptElementKind; text?: string }
> = {
  Digit1: { kind: "scene" },
  Digit2: { kind: "action" },
  Digit3: { kind: "character" },
  Digit4: { kind: "parenthetical" },
  Digit5: { kind: "dialogue" },
  Digit6: { kind: "beat", text: "停顿。" },
  Digit7: { kind: "transition" },
};

function getAutomaticNextKind(kind: ScriptElementKind) {
  return kind === "beat" ? "action" : undefined;
}

export default function WorkspaceScript({
  characters = [],
  generatedContent,
  generatedContentEdited = false,
  initialContent,
  initialDocument,
  onAiAction,
  onDocumentChange,
  onGeneratedContentEditedChange,
}: WorkspaceScriptProps) {
  const initialDocumentRef = useRef(
    (() => {
      if (!initialDocument) {
        return createInitialScriptDocument(initialContent, generatedContent);
      }

      const document = normalizeScriptDocument(
        structuredClone(initialDocument),
      );
      return {
        document,
        generatedSnapshot: getGeneratedJsonSnapshot(document),
      };
    })(),
  );
  const generatedContentEditedRef = useRef(generatedContentEdited);
  const isSyncingGeneratedContentRef = useRef(false);
  const onDocumentChangeRef = useRef(onDocumentChange);
  const onGeneratedContentEditedChangeRef = useRef(
    onGeneratedContentEditedChange,
  );
  const lastGeneratedSnapshotRef = useRef(
    initialDocumentRef.current.generatedSnapshot,
  );
  const [activeKind, setActiveKind] = useState<ScriptElementKind>("action");
  const [people, setPeople] = useState(() => createInitialPeople(characters));
  const peopleRef = useRef(people);
  const createPersonRef = useRef<(name: string) => ScriptPerson>((name) => ({
    id: crypto.randomUUID(),
    name,
    type: "people",
  }));
  peopleRef.current = people;
  createPersonRef.current = (name) => {
    const nextName = name.trim();
    const existingPerson = peopleRef.current.find(
      (person) =>
        person.name.toLocaleLowerCase() === nextName.toLocaleLowerCase(),
    );
    if (existingPerson) return existingPerson;

    const person: ScriptPerson = {
      id: crypto.randomUUID(),
      name: nextName,
      type: "people",
    };
    const nextPeople = [...peopleRef.current, person];
    peopleRef.current = nextPeople;
    setPeople(nextPeople);
    return person;
  };
  onDocumentChangeRef.current = onDocumentChange;
  onGeneratedContentEditedChangeRef.current =
    onGeneratedContentEditedChange;

  const plugins = useMemo(
    () => [
      ScriptLineDndPlugin,
      ScriptBehaviorPlugin,
      ScriptActionPlugin,
      ScriptParentheticalPlugin,
      ScriptDialoguePlugin,
      ScriptBeatPlugin,
      ScriptScenePlugin,
      ScriptCharacterPlugin.configure({
        options: {
          getPeople: () => peopleRef.current,
          onCreatePerson: (name) => createPersonRef.current(name),
        },
      }),
      ScriptTransitionPlugin,
    ],
    [],
  );
  const editor = usePlateEditor<
    ScriptDocument,
    (typeof plugins)[number]
  >(
    {
      nodeId: {
        filterInline: true,
        filterText: true,
        idCreator: () => crypto.randomUUID(),
        initialValueIds: "always",
        reuseId: false,
      },
      plugins,
      value: initialDocumentRef.current.document,
    },
    [],
  );

  useEffect(() => {
    onDocumentChangeRef.current?.(
      normalizeScriptDocument(editor.children),
    );
  }, [editor]);

  useEffect(() => {
    if (generatedContentEditedRef.current) return;

    const document = normalizeScriptDocument(editor.children);
    if (hasDiscontinuousGeneratedContent(document)) {
      generatedContentEditedRef.current = true;
      onGeneratedContentEditedChangeRef.current?.(true);
      return;
    }

    isSyncingGeneratedContentRef.current = true;
    try {
      lastGeneratedSnapshotRef.current = syncGeneratedScriptContent(
        editor,
        generatedContent,
      );
    } finally {
      isSyncingGeneratedContentRef.current = false;
    }
  }, [editor, generatedContent]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        !editor.api.isFocused() ||
        !(event.metaKey || event.ctrlKey) ||
        !event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const element = SCRIPT_ELEMENT_SHORTCUTS[event.code];
      if (!element) return;

      const nextKind = getAutomaticNextKind(element.kind);
      event.preventDefault();
      activateScriptElement(
        editor,
        element.kind,
        element.text,
        {},
        nextKind,
      );
      setActiveKind(nextKind ?? element.kind);
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [editor]);

  const selectElementKind = (kind: ScriptElementKind, text = "") => {
    const nextKind = getAutomaticNextKind(kind);
    const lineText = kind === "beat" && !text ? "停顿。" : text;
    activateScriptElement(editor, kind, lineText, {}, nextKind);
    setActiveKind(nextKind ?? kind);
  };

  return (
    <div className="screenplay-workspace">
      <ScriptToolbar
        activeKind={activeKind}
        onSelect={selectElementKind}
      />
      <ScrollArea.Root
        className="screenplay-scroll-area"
        type="hover"
      >
        <ScrollArea.Viewport
          className="screenplay-scroll-viewport"
        >
          <div className="screenplay-canvas">
            <section
              aria-label="结构化剧本编辑器"
              className="screenplay-paper"
            >
              <div className="screenplay-editor">
                <Plate
                  editor={editor}
                  onSelectionChange={({ editor: updatedEditor }) => {
                    setActiveKind(
                      getActiveScriptElementKind(updatedEditor),
                    );
                  }}
                  onValueChange={({ value }) => {
                    const document = normalizeScriptDocument(value);
                    onDocumentChangeRef.current?.(document);
                    if (isSyncingGeneratedContentRef.current) return;

                    const snapshot = getGeneratedScriptSnapshot(document);
                    if (
                      (snapshot !== lastGeneratedSnapshotRef.current ||
                        hasDiscontinuousGeneratedContent(document)) &&
                      !generatedContentEditedRef.current
                    ) {
                      generatedContentEditedRef.current = true;
                      onGeneratedContentEditedChangeRef.current?.(true);
                    }
                  }}
                >
                  <PlateContent
                    aria-keyshortcuts="Tab Shift+Tab"
                    aria-label="剧本编辑器"
                    className="screenplay-editor-content"
                    spellCheck
                  />
                  <ScriptAiToolbar
                    editor={editor}
                    onAction={onAiAction}
                  />
                </Plate>
              </div>
            </section>
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="screenplay-scrollbar"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="screenplay-scrollbar__thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
