import { Bold, Heading2, Pilcrow } from "lucide-react";
import { Toolbar } from "radix-ui";

import "./OutlineToolbar.css";

export type OutlineBlockKind = "heading" | "paragraph";

type OutlineToolbarProps = {
  activeBlock: OutlineBlockKind;
  boldActive: boolean;
  onBlockSelect: (kind: OutlineBlockKind) => void;
  onBoldToggle: () => void;
};

const BLOCK_ITEMS = [
  { icon: Pilcrow, kind: "paragraph", label: "正文" },
  { icon: Heading2, kind: "heading", label: "标题" },
] satisfies Array<{
  icon: typeof Pilcrow;
  kind: OutlineBlockKind;
  label: string;
}>;

export default function OutlineToolbar({
  activeBlock,
  boldActive,
  onBlockSelect,
  onBoldToggle,
}: OutlineToolbarProps) {
  return (
    <Toolbar.Root aria-label="大纲格式工具栏" className="outline-toolbar">
      {BLOCK_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <Toolbar.Button
            aria-pressed={activeBlock === item.kind}
            className="outline-toolbar__button"
            data-active={activeBlock === item.kind}
            key={item.kind}
            onClick={() => onBlockSelect(item.kind)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Icon aria-hidden="true" size={14} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Toolbar.Button>
        );
      })}
      <Toolbar.Button
        aria-keyshortcuts="Control+B Meta+B"
        aria-label="加粗"
        aria-pressed={boldActive}
        className="outline-toolbar__button outline-toolbar__button--bold"
        data-active={boldActive}
        onClick={onBoldToggle}
        onMouseDown={(event) => event.preventDefault()}
        title="加粗 · Ctrl/⌘ + B"
        type="button"
      >
        <Bold aria-hidden="true" size={14} strokeWidth={2.1} />
        <span>加粗</span>
      </Toolbar.Button>
    </Toolbar.Root>
  );
}
