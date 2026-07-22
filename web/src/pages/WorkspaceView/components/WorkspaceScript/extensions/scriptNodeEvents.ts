import type { Path } from "platejs";

import type { ScriptElementKind } from "../types";

const SCRIPT_NODE_OPEN_EVENT = {
  character: "plate:character:open",
  scene: "plate:scene_heading:open",
  transition: "plate:transition:open",
} as const;

export type ScriptSelectorKind = keyof typeof SCRIPT_NODE_OPEN_EVENT;

type ScriptNodeOpenDetail = {
  path: string;
};

export function isScriptSelectorKind(
  kind: ScriptElementKind,
): kind is ScriptSelectorKind {
  return kind in SCRIPT_NODE_OPEN_EVENT;
}

export function getScriptNodePathKey(path: Path) {
  return path.join(",");
}

export function openScriptNodeSelector(
  kind: ScriptElementKind,
  path: Path,
) {
  if (!isScriptSelectorKind(kind) || typeof window === "undefined") {
    return;
  }

  const eventName = SCRIPT_NODE_OPEN_EVENT[kind];
  const pathKey = getScriptNodePathKey(path);
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<ScriptNodeOpenDetail>(eventName, {
        detail: { path: pathKey },
      }),
    );
  }, 40);
}

export function subscribeScriptNodeSelector(
  kind: ScriptSelectorKind,
  pathKey: string,
  onOpen: () => void,
) {
  if (typeof window === "undefined") return () => undefined;

  const handleOpen = (event: Event) => {
    const detail = (event as CustomEvent<ScriptNodeOpenDetail>).detail;
    if (detail?.path === pathKey) onOpen();
  };

  const eventName = SCRIPT_NODE_OPEN_EVENT[kind];
  window.addEventListener(eventName, handleOpen);
  return () => window.removeEventListener(eventName, handleOpen);
}
