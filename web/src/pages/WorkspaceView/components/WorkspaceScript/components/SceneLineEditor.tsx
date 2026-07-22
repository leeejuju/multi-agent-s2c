import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Popover, RadioGroup } from "radix-ui";

import { subscribeScriptNodeSelector } from "../extensions/scriptNodeEvents";
import {
  SCENE_INTERIOR_OPTIONS,
  SCENE_INTERIOR_SHORT_LABELS,
  SCENE_TIME_OPTIONS,
  SCENE_TIME_SHORT_LABELS,
  type SceneDraft,
  type SceneInterior,
  type SceneReference,
  type SceneTime,
} from "../types";

import "./SceneLineEditor.css";

type SceneField = "interior" | "location" | "time";

type SceneLineEditorProps = {
  activationPath: string;
  getScenes: () => SceneReference[];
  onActivate: () => void;
  onChange: (scene: SceneDraft) => void;
  onCommit: (scene: SceneDraft) => void;
  onExit: (direction: 1 | -1) => void;
  scene: SceneDraft;
  sceneNumber: number;
};

export default function SceneLineEditor({
  activationPath,
  getScenes,
  onActivate,
  onChange,
  onCommit,
  onExit,
  scene,
  sceneNumber,
}: SceneLineEditorProps) {
  const [activeField, setActiveField] = useState<SceneField | null>(null);
  const [locationInput, setLocationInput] = useState(scene.location);
  const [scenes, setScenes] = useState<SceneReference[]>([]);
  const interiorOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const interiorTriggerRef = useRef<HTMLButtonElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationTriggerRef = useRef<HTMLButtonElement>(null);
  const sceneOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const timeOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const timeTriggerRef = useRef<HTMLButtonElement>(null);

  const focusField = useCallback(
    (field: SceneField) => {
      onActivate();
      if (field === "location") {
        setScenes(getScenes());
        setLocationInput(scene.location);
      }
      setActiveField(field);

      window.requestAnimationFrame(() => {
        if (field === "location") {
          locationInputRef.current?.focus();
          locationInputRef.current?.select();
        } else if (field === "time") {
          const selectedIndex = SCENE_TIME_OPTIONS.findIndex(
            (option) => option.value === scene.time,
          );
          timeOptionRefs.current[Math.max(selectedIndex, 0)]?.focus();
        } else {
          const selectedIndex = SCENE_INTERIOR_OPTIONS.findIndex(
            (option) => option.value === scene.interior,
          );
          interiorOptionRefs.current[Math.max(selectedIndex, 0)]?.focus();
        }
      });
    },
    [
      getScenes,
      onActivate,
      scene.interior,
      scene.location,
      scene.time,
    ],
  );

  useEffect(
    () =>
      subscribeScriptNodeSelector("scene", activationPath, () => {
        focusField("location");
      }),
    [activationPath, focusField],
  );

  useEffect(() => {
    if (activeField !== "location") setLocationInput(scene.location);
  }, [activeField, scene.location]);

  const setFieldOpen = (field: SceneField, open: boolean) => {
    if (open) {
      focusField(field);
      return;
    }
    setActiveField((current) => (current === field ? null : current));
  };

  const chooseLocation = (location: string) => {
    const nextLocation = location.trim();
    if (!nextLocation) return;

    setLocationInput(nextLocation);
    onChange({ ...scene, location: nextLocation });
    focusField("time");
  };

  const submitLocation = () => chooseLocation(locationInput);

  const moveFromLocationInput = (reverse: boolean) => {
    if (reverse) {
      onExit(-1);
      return;
    }

    const nextLocation = locationInput.trim();
    if (nextLocation) {
      setLocationInput(nextLocation);
      onChange({ ...scene, location: nextLocation });
    }
    focusField("time");
  };

  const chooseTime = (value: string) => {
    onChange({
      ...scene,
      location: scene.location.trim(),
      time: value as SceneTime,
    });
    focusField("interior");
  };

  const chooseInterior = (value: string) => {
    const nextScene: SceneDraft = {
      ...scene,
      interior: value as SceneInterior,
      location: scene.location.trim(),
    };
    setActiveField(null);
    onCommit(nextScene);
  };

  const focusTrigger = (field: SceneField) => {
    if (field === "location") locationTriggerRef.current?.focus();
    if (field === "time") timeTriggerRef.current?.focus();
    if (field === "interior") interiorTriggerRef.current?.focus();
  };

  const moveFromField = (field: SceneField, reverse: boolean) => {
    if (field === "location") {
      if (reverse) onExit(-1);
      else focusField("time");
      return;
    }
    if (field === "time") {
      focusField(reverse ? "location" : "interior");
      return;
    }
    if (reverse) focusField("time");
    else onExit(1);
  };

  const handleTriggerKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    field: SceneField,
  ) => {
    if (event.key !== "Tab") return;

    event.preventDefault();
    moveFromField(field, event.shiftKey);
  };

  const filteredScenes = scenes.filter((item) => {
    const query = locationInput.trim().toLocaleLowerCase();
    return !query || item.location.toLocaleLowerCase().includes(query);
  });

  return (
    <>
      <span
        aria-hidden="true"
        className="screenplay-scene-number"
        contentEditable={false}
      >
        {sceneNumber}.
      </span>

      <Popover.Root
        onOpenChange={(open) => setFieldOpen("location", open)}
        open={activeField === "location"}
      >
        <Popover.Trigger asChild>
          <button
            aria-label={scene.location ? `场地：${scene.location}` : "选择场地"}
            className="screenplay-field-trigger screenplay-field-trigger--location"
            contentEditable={false}
            data-active={activeField === "location"}
            data-empty={!scene.location.trim()}
            onKeyDown={(event) => handleTriggerKeyDown(event, "location")}
            ref={locationTriggerRef}
            type="button"
          >
            {scene.location.trim() || "场地"}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            className="screenplay-scene-line-editor__content"
            data-field="location"
            onCloseAutoFocus={(event) => event.preventDefault()}
            onEscapeKeyDown={() => {
              window.requestAnimationFrame(() => focusTrigger("location"));
            }}
            onOpenAutoFocus={(event) => event.preventDefault()}
            sideOffset={6}
          >
            <div className="screenplay-location-picker">
              <form
                className="screenplay-location-picker__form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitLocation();
                }}
              >
                <input
                  aria-label="场地"
                  className="screenplay-location-picker__input"
                  onChange={(event) => setLocationInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && filteredScenes.length) {
                      event.preventDefault();
                      sceneOptionRefs.current[0]?.focus();
                      return;
                    }
                    if (event.key === "Tab") {
                      event.preventDefault();
                      moveFromLocationInput(event.shiftKey);
                    }
                  }}
                  placeholder="输入或选择场地"
                  ref={locationInputRef}
                  value={locationInput}
                />
              </form>
              {filteredScenes.length ? (
                <div
                  aria-label="已有场地"
                  className="screenplay-scene-line-editor__options"
                  role="listbox"
                >
                  {filteredScenes.map((item, index) => (
                    <button
                      className="screenplay-scene-line-editor__option"
                      key={item.key}
                      onClick={() => chooseLocation(item.location)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          sceneOptionRefs.current[
                            Math.min(index + 1, filteredScenes.length - 1)
                          ]?.focus();
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          if (index === 0) locationInputRef.current?.focus();
                          else sceneOptionRefs.current[index - 1]?.focus();
                        } else if (event.key === "Tab") {
                          event.preventDefault();
                          if (event.shiftKey) locationInputRef.current?.focus();
                          else chooseLocation(item.location);
                        }
                      }}
                      ref={(element) => {
                        sceneOptionRefs.current[index] = element;
                      }}
                      role="option"
                      type="button"
                    >
                      {item.location}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="screenplay-scene-line-editor__empty">
                  回车使用这个场地
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root
        onOpenChange={(open) => setFieldOpen("time", open)}
        open={activeField === "time"}
      >
        <Popover.Trigger asChild>
          <button
            aria-label={scene.time ? `时间：${scene.time}` : "选择时间"}
            className="screenplay-field-trigger"
            contentEditable={false}
            data-active={activeField === "time"}
            data-empty={!scene.time}
            onKeyDown={(event) => handleTriggerKeyDown(event, "time")}
            ref={timeTriggerRef}
            type="button"
          >
            {scene.time ? SCENE_TIME_SHORT_LABELS[scene.time] : "日/夜"}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            className="screenplay-scene-line-editor__content"
            data-field="time"
            onCloseAutoFocus={(event) => event.preventDefault()}
            onEscapeKeyDown={() => {
              window.requestAnimationFrame(() => focusTrigger("time"));
            }}
            onOpenAutoFocus={(event) => event.preventDefault()}
            sideOffset={6}
          >
            <RadioGroup.Root
              aria-label="选择场景时间"
              className="screenplay-scene-line-editor__options"
              onValueChange={chooseTime}
              value={scene.time ?? ""}
            >
              {SCENE_TIME_OPTIONS.map((option, index) => (
                <RadioGroup.Item
                  className="screenplay-scene-line-editor__option"
                  key={option.value}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab") return;
                    event.preventDefault();
                    if (event.shiftKey) focusField("location");
                    else chooseTime(option.value);
                  }}
                  ref={(element) => {
                    timeOptionRefs.current[index] = element;
                  }}
                  value={option.value}
                >
                  {option.label}
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <span
        aria-hidden="true"
        className="screenplay-scene-separator"
        contentEditable={false}
      >
        /
      </span>

      <Popover.Root
        onOpenChange={(open) => setFieldOpen("interior", open)}
        open={activeField === "interior"}
      >
        <Popover.Trigger asChild>
          <button
            aria-label={scene.interior ? `景别：${scene.interior}` : "选择内外景"}
            className="screenplay-field-trigger"
            contentEditable={false}
            data-active={activeField === "interior"}
            data-empty={!scene.interior}
            onKeyDown={(event) => handleTriggerKeyDown(event, "interior")}
            ref={interiorTriggerRef}
            type="button"
          >
            {scene.interior
              ? SCENE_INTERIOR_SHORT_LABELS[scene.interior]
              : "内/外"}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            className="screenplay-scene-line-editor__content"
            data-field="interior"
            onCloseAutoFocus={(event) => event.preventDefault()}
            onEscapeKeyDown={() => {
              window.requestAnimationFrame(() => focusTrigger("interior"));
            }}
            onOpenAutoFocus={(event) => event.preventDefault()}
            sideOffset={6}
          >
            <RadioGroup.Root
              aria-label="选择内景或外景"
              className="screenplay-scene-line-editor__options"
              onValueChange={chooseInterior}
              value={scene.interior ?? ""}
            >
              {SCENE_INTERIOR_OPTIONS.map((option, index) => (
                <RadioGroup.Item
                  className="screenplay-scene-line-editor__option"
                  key={option.value}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab") return;
                    event.preventDefault();
                    if (event.shiftKey) focusField("time");
                    else chooseInterior(option.value);
                  }}
                  ref={(element) => {
                    interiorOptionRefs.current[index] = element;
                  }}
                  value={option.value}
                >
                  {option.label}
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
