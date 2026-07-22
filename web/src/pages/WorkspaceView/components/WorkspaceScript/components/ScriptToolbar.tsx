import {
  Activity,
  ArrowRightLeft,
  Clapperboard,
  MessageSquare,
  Parentheses,
  Pause,
  UserRound,
} from "lucide-react";
import { Toolbar } from "radix-ui";

import type { ScriptElementKind } from "../types";

import "./ScriptToolbar.css";

type ScriptToolbarProps = {
  activeKind: ScriptElementKind;
  onSelect: (kind: ScriptElementKind) => void;
};

const TOOL_ITEMS = [
  { icon: Clapperboard, kind: "scene", label: "场景", shortcutIndex: 1 },
  { icon: Activity, kind: "action", label: "动作", shortcutIndex: 2 },
  { icon: UserRound, kind: "character", label: "角色", shortcutIndex: 3 },
  {
    icon: Parentheses,
    kind: "parenthetical",
    label: "括注",
    shortcutIndex: 4,
  },
  {
    icon: MessageSquare,
    kind: "dialogue",
    label: "对白",
    shortcutIndex: 5,
  },
  { icon: Pause, kind: "beat", label: "节拍", shortcutIndex: 6 },
  {
    icon: ArrowRightLeft,
    kind: "transition",
    label: "转场",
    shortcutIndex: 7,
  },
] satisfies Array<{
  icon: typeof Activity;
  kind: ScriptElementKind;
  label: string;
  shortcutIndex: number;
}>;

export default function ScriptToolbar({
  activeKind,
  onSelect,
}: ScriptToolbarProps) {
  return (
    <Toolbar.Root
      aria-label="剧本结构工具栏"
      className="screenplay-toolbar"
    >
      {TOOL_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <Toolbar.Button
            aria-keyshortcuts={`Meta+Alt+${item.shortcutIndex} Control+Alt+${item.shortcutIndex}`}
            aria-pressed={activeKind === item.kind}
            className="screenplay-toolbar-button"
            data-active={activeKind === item.kind}
            key={item.kind}
            onClick={() => onSelect(item.kind)}
            title={`${item.label} · Ctrl/⌘ + Alt/⌥ + ${item.shortcutIndex}`}
            type="button"
          >
            <Icon aria-hidden="true" size={14} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Toolbar.Button>
        );
      })}
    </Toolbar.Root>
  );
}
