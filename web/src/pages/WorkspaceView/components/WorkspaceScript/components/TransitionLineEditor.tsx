import { useCallback, useEffect, useState } from "react";
import { DropdownMenu } from "radix-ui";

import { subscribeScriptNodeSelector } from "../extensions/scriptNodeEvents";

import "./TransitionLineEditor.css";

export const TRANSITION_OPTIONS = [
  { description: "直接进入下一画面", label: "切至", value: "切至：" },
  { description: "两个画面短暂重叠", label: "叠画", value: "叠画：" },
  { description: "从黑场进入画面", label: "淡入", value: "淡入：" },
  { description: "画面逐渐退至黑场", label: "淡出", value: "淡出：" },
  { description: "淡出并进入指定画面", label: "淡出至", value: "淡出至：" },
  { description: "不加缓冲地直接切换", label: "硬切至", value: "硬切至：" },
  { description: "用相似构图衔接画面", label: "匹配切至", value: "匹配切至：" },
  { description: "在同一动作或时间中跳跃", label: "跳切至", value: "跳切至：" },
] as const;

type TransitionLineEditorProps = {
  activationPath: string;
  onActivate: () => void;
  onChoose: (value: string) => void;
  onTab: (direction: 1 | -1) => void;
  value: string;
};

export default function TransitionLineEditor({
  activationPath,
  onActivate,
  onChoose,
  onTab,
  value,
}: TransitionLineEditorProps) {
  const [open, setOpen] = useState(false);

  const openPicker = useCallback(() => {
    onActivate();
    setOpen(true);
  }, [onActivate]);

  useEffect(
    () =>
      subscribeScriptNodeSelector(
        "transition",
        activationPath,
        openPicker,
      ),
    [activationPath, openPicker],
  );

  return (
    <DropdownMenu.Root
      onOpenChange={(nextOpen) => {
        if (nextOpen) openPicker();
        else setOpen(false);
      }}
      open={open}
    >
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={value ? `转场：${value}` : "选择转场"}
          className="screenplay-field-trigger screenplay-transition-trigger"
          contentEditable={false}
          data-active={open}
          data-empty={!value}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            setOpen(false);
            onTab(event.shiftKey ? -1 : 1);
          }}
          type="button"
        >
          {value || "转场"}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="screenplay-transition-line-editor"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            setOpen(false);
            onTab(event.shiftKey ? -1 : 1);
          }}
          sideOffset={6}
        >
          {TRANSITION_OPTIONS.map((option) => (
            <DropdownMenu.Item
              className="screenplay-transition-line-editor__item"
              key={option.value}
              onSelect={() => onChoose(option.value)}
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
