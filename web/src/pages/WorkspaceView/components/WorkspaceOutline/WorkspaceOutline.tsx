import { useEffect, useRef, useState } from "react";
import type { TElement, TText } from "platejs";
import {
  ParagraphPlugin,
  Plate,
  PlateContent,
  PlateElement,
  PlateLeaf,
  createPlatePlugin,
  type PlateElementProps,
  type PlateLeafProps,
  type TPlateEditor,
  usePlateEditor,
} from "platejs/react";
import { ScrollArea } from "radix-ui";

import OutlineToolbar, {
  type OutlineBlockKind,
} from "./components/OutlineToolbar";
import "./WorkspaceOutline.css";

type WorkspaceOutlineProps = {
  onChange: (value: string) => void;
  placeholder: string;
  title: string;
  value: string;
};

const OUTLINE_PARAGRAPH_NODE_TYPE = "outline_paragraph";
const OUTLINE_HEADING_NODE_TYPE = "outline_heading";
const OUTLINE_BOLD_MARK = "bold";

type OutlineText = TText & {
  bold?: boolean;
  text: string;
};

type OutlineElement = TElement & {
  children: OutlineText[];
  type:
    | typeof OUTLINE_PARAGRAPH_NODE_TYPE
    | typeof OUTLINE_HEADING_NODE_TYPE;
};

type OutlineDocument = OutlineElement[];
type OutlineEditor = TPlateEditor<OutlineDocument>;

function OutlineParagraphElement(
  props: PlateElementProps<OutlineElement>,
) {
  return (
    <PlateElement
      {...props}
      as="p"
      className="workspace-outline__paragraph"
    />
  );
}

function OutlineHeadingElement(props: PlateElementProps<OutlineElement>) {
  return (
    <PlateElement
      {...props}
      as="h2"
      className="workspace-outline__heading"
    />
  );
}

function OutlineBoldLeaf(props: PlateLeafProps<OutlineText>) {
  return (
    <PlateLeaf
      {...props}
      as="strong"
      className="workspace-outline__bold"
    />
  );
}

const OutlineParagraphPlugin = ParagraphPlugin.configure({
  node: {
    isElement: true,
    type: OUTLINE_PARAGRAPH_NODE_TYPE,
  },
}).withComponent(OutlineParagraphElement);

const OutlineHeadingPlugin = createPlatePlugin({
  key: OUTLINE_HEADING_NODE_TYPE,
  node: { isElement: true },
}).withComponent(OutlineHeadingElement);

const OutlineBoldPlugin = createPlatePlugin({
  key: OUTLINE_BOLD_MARK,
  node: { isLeaf: true },
}).withComponent(OutlineBoldLeaf);

const OutlineKeyboardPlugin = createPlatePlugin({
  handlers: {
    onKeyDown: ({ editor, event }) => {
      const block = editor.api.block({ highest: true })?.[0];
      if (
        event.key === "Enter" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        block?.type === OUTLINE_HEADING_NODE_TYPE
      ) {
        event.preventDefault();
        editor.tf.insertBreak();
        editor.tf.setNodes({ type: OUTLINE_PARAGRAPH_NODE_TYPE });
        return true;
      }

      if (
        event.defaultPrevented ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLocaleLowerCase() !== "b"
      ) {
        return false;
      }

      event.preventDefault();
      editor.tf.toggleMark(OUTLINE_BOLD_MARK);
      return true;
    },
  },
  key: "outlineKeyboard",
  priority: 1000,
});

const OUTLINE_PLUGINS = [
  OutlineKeyboardPlugin,
  OutlineParagraphPlugin,
  OutlineHeadingPlugin,
  OutlineBoldPlugin,
];

function parseInlineMarkdown(value: string): OutlineText[] {
  const children: OutlineText[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;

  for (const match of value.matchAll(boldPattern)) {
    const start = match.index;
    if (start > cursor) {
      children.push({ text: value.slice(cursor, start) });
    }
    children.push({ bold: true, text: match[1] });
    cursor = start + match[0].length;
  }

  if (cursor < value.length) {
    children.push({ text: value.slice(cursor) });
  }

  return children.length ? children : [{ text: "" }];
}

function parseOutlineDocument(value: string): OutlineDocument {
  return value.replaceAll("\r\n", "\n").split("\n").map((line) => {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    return {
      children: parseInlineMarkdown(heading?.[1] ?? line),
      type: heading
        ? OUTLINE_HEADING_NODE_TYPE
        : OUTLINE_PARAGRAPH_NODE_TYPE,
    };
  });
}

function serializeInlineMarkdown(children: OutlineText[]) {
  return children
    .map((child) =>
      child.bold && child.text ? `**${child.text}**` : child.text,
    )
    .join("");
}

function serializeOutlineDocument(value: OutlineDocument) {
  return value
    .map((element) => {
      const line = serializeInlineMarkdown(element.children);
      return element.type === OUTLINE_HEADING_NODE_TYPE
        ? `# ${line}`
        : line;
    })
    .join("\n");
}

function getActiveBlockKind(editor: OutlineEditor): OutlineBlockKind {
  const block = editor.api.block({ highest: true })?.[0];
  return block?.type === OUTLINE_HEADING_NODE_TYPE
    ? "heading"
    : "paragraph";
}

export default function WorkspaceOutline({
  onChange,
  placeholder,
  title,
  value,
}: WorkspaceOutlineProps) {
  const initialDocumentRef = useRef(parseOutlineDocument(value));
  const onChangeRef = useRef(onChange);
  const externalValueRef = useRef(
    serializeOutlineDocument(initialDocumentRef.current),
  );
  const [activeBlock, setActiveBlock] =
    useState<OutlineBlockKind>("paragraph");
  const [boldActive, setBoldActive] = useState(false);
  onChangeRef.current = onChange;

  const editor = usePlateEditor<
    OutlineDocument,
    (typeof OUTLINE_PLUGINS)[number]
  >(
    {
      plugins: OUTLINE_PLUGINS,
      value: initialDocumentRef.current,
    },
    [],
  );

  useEffect(() => {
    const nextDocument = parseOutlineDocument(value);
    const normalizedValue = serializeOutlineDocument(nextDocument);
    if (normalizedValue === externalValueRef.current) return;

    externalValueRef.current = normalizedValue;
    editor.tf.withoutSaving(() => editor.tf.setValue(nextDocument));
  }, [editor, value]);

  const syncToolbarState = (updatedEditor: OutlineEditor) => {
    setActiveBlock(getActiveBlockKind(updatedEditor));
    setBoldActive(updatedEditor.api.hasMark(OUTLINE_BOLD_MARK));
  };

  const selectBlock = (kind: OutlineBlockKind) => {
    if (getActiveBlockKind(editor) === kind) return;

    editor.tf.toggleBlock(
      kind === "heading"
        ? OUTLINE_HEADING_NODE_TYPE
        : OUTLINE_PARAGRAPH_NODE_TYPE,
      { defaultType: OUTLINE_PARAGRAPH_NODE_TYPE },
    );
    editor.tf.focus();
    syncToolbarState(editor);
  };

  const toggleBold = () => {
    editor.tf.toggleMark(OUTLINE_BOLD_MARK);
    editor.tf.focus();
    syncToolbarState(editor);
  };

  return (
    <div className="workspace-outline">
      <OutlineToolbar
        activeBlock={activeBlock}
        boldActive={boldActive}
        onBlockSelect={selectBlock}
        onBoldToggle={toggleBold}
      />
      <ScrollArea.Root className="workspace-outline__scroll-area" type="hover">
        <ScrollArea.Viewport className="workspace-outline__scroll-viewport">
          <div className="workspace-outline__canvas">
            <section
              aria-label={`${title} 大纲编辑器`}
              className="workspace-outline__paper"
            >
              <Plate
                editor={editor}
                onSelectionChange={({ editor: updatedEditor }) =>
                  syncToolbarState(updatedEditor as OutlineEditor)
                }
                onValueChange={({ editor: updatedEditor, value: nextValue }) => {
                  const serializedValue = serializeOutlineDocument(
                    nextValue as OutlineDocument,
                  );
                  syncToolbarState(updatedEditor as OutlineEditor);
                  if (serializedValue === externalValueRef.current) return;

                  externalValueRef.current = serializedValue;
                  onChangeRef.current(serializedValue);
                }}
              >
                <PlateContent
                  aria-keyshortcuts="Control+B Meta+B"
                  aria-label={`${title} 大纲编辑器`}
                  className="workspace-outline__editor"
                  placeholder={placeholder}
                  spellCheck
                />
              </Plate>
            </section>
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="workspace-outline__scrollbar"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="workspace-outline__scrollbar-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
