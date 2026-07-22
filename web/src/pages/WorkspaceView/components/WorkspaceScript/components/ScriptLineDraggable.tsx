import { DndPlugin, selectBlockById, useDraggable, useDropLine } from "@platejs/dnd";
import { GripVertical } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  MemoizedChildren,
  type PlateElementProps,
  type RenderNodeWrapper,
  useSelected,
} from "platejs/react";

import { getScriptElementKind } from "../scriptContent";
import type { ScriptElement } from "../types";

import "./ScriptLineDraggable.css";

const ScriptLineDraggable: RenderNodeWrapper = ({ editor, element, path }) => {
  if (
    editor.dom.readOnly ||
    path.length !== 1 ||
    typeof element.id !== "string"
  ) {
    return;
  }

  return (props) => <DraggableScriptLine {...props} />;
};

function DraggableScriptLine(props: PlateElementProps) {
  const { children, editor, element } = props;
  const selected = useSelected();
  const { isDragging, nodeRef, handleRef } = useDraggable({ element });
  const elementId = String(element.id);
  const kind = getScriptElementKind(element as ScriptElement);

  return (
    <div
      className="screenplay-line-block"
      data-dragging={isDragging || undefined}
      data-kind={kind}
      data-selected={selected || undefined}
    >
      <button
        ref={handleRef}
        aria-label="拖动调整此行顺序"
        aria-pressed={selected}
        className="screenplay-line-block__handle"
        contentEditable={false}
        data-plate-prevent-deselect
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          selectBlockById(editor, elementId);
        }}
        tabIndex={-1}
        title="拖动调整行顺序；点击选择整行"
        type="button"
      >
        <GripVertical aria-hidden="true" />
      </button>

      <div ref={nodeRef} className="screenplay-line-block__content">
        <MemoizedChildren>{children}</MemoizedChildren>
        <ScriptLineDropIndicator />
      </div>
    </div>
  );
}

function ScriptLineDropIndicator() {
  const { dropLine } = useDropLine();

  if (dropLine !== "top" && dropLine !== "bottom") return null;

  return (
    <div
      aria-hidden="true"
      className="screenplay-line-block__drop-indicator"
      contentEditable={false}
      data-direction={dropLine}
    />
  );
}

export const ScriptLineDndPlugin = DndPlugin.configure({
  render: {
    aboveNodes: ScriptLineDraggable,
    aboveSlate: ({ children }) => (
      <DndProvider backend={HTML5Backend}>{children}</DndProvider>
    ),
  },
});

export default ScriptLineDraggable;
