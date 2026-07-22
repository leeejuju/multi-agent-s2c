import {
  flip,
  offset,
  shift,
  useFloatingToolbar,
  useFloatingToolbarState,
} from "@platejs/floating";
import {
  MessageCircleQuestion,
  Scissors,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  useEditorId,
  useEventEditorValue,
} from "platejs/react";

import { getSelectedScriptText } from "../scriptContent";
import type {
  ScriptAiAction,
  ScriptAiRequest,
  ScriptEditor,
} from "../types";

import "./ScriptAiToolbar.css";

type ScriptAiToolbarProps = {
  editor: ScriptEditor;
  onAction: (request: ScriptAiRequest) => void;
};

const AI_ACTIONS = [
  {
    action: "chat",
    icon: MessageCircleQuestion,
    label: "问 AI",
    title: "围绕选中内容提问",
  },
  {
    action: "polish",
    icon: Sparkles,
    label: "润色",
    title: "改善措辞、节奏和可读性",
  },
  {
    action: "condense",
    icon: Scissors,
    label: "精简",
    title: "删除重复并压缩篇幅",
  },
  {
    action: "enhance",
    icon: WandSparkles,
    label: "增强",
    title: "强化冲突、潜台词和画面感",
  },
] satisfies Array<{
  action: ScriptAiAction;
  icon: typeof Sparkles;
  label: string;
  title: string;
}>;

export default function ScriptAiToolbar({
  editor,
  onAction,
}: ScriptAiToolbarProps) {
  const editorId = useEditorId();
  const focusedEditorId = useEventEditorValue("focus");
  const state = useFloatingToolbarState({
    editorId,
    floatingOptions: {
      middleware: [
        offset(10),
        flip({ padding: 16 }),
        shift({ padding: 16 }),
      ],
      placement: "top",
    },
    focusedEditorId,
  });
  const { clickOutsideRef, hidden, props, ref } =
    useFloatingToolbar(state);
  const selectedText = getSelectedScriptText(editor);

  if (hidden || !selectedText) return null;

  const runAction = (action: ScriptAiAction) => {
    const currentText = getSelectedScriptText(editor);
    if (!currentText) return;
    onAction({ action, selectedText: currentText });
  };

  return (
    <div ref={clickOutsideRef}>
      <div
        {...props}
        aria-label="AI 选区工具栏"
        className="screenplay-ai-menu"
        ref={ref}
        role="toolbar"
      >
        <span aria-hidden="true" className="screenplay-ai-menu-mark">
          <Sparkles size={13} strokeWidth={2} />
          <span>AI</span>
        </span>
        <span aria-hidden="true" className="screenplay-ai-menu-separator" />

        {AI_ACTIONS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              aria-label={item.title}
              className="screenplay-ai-menu-button"
              key={item.action}
              onClick={() => runAction(item.action)}
              onMouseDown={(event) => event.preventDefault()}
              title={item.title}
              type="button"
            >
              <Icon aria-hidden="true" size={14} strokeWidth={1.9} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
