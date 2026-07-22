import { useCallback, useEffect, useRef, useState } from "react";
import { Popover } from "radix-ui";

import { subscribeScriptNodeSelector } from "../extensions/scriptNodeEvents";
import type { ScriptPerson } from "../types";

import "./CharacterLineEditor.css";

type CharacterLineEditorProps = {
  activationPath: string;
  characterName: string;
  getPeople: () => ScriptPerson[];
  onActivate: () => void;
  onChoose: (person: ScriptPerson) => void;
  onCreate: (name: string) => ScriptPerson;
  onTab: (direction: 1 | -1) => void;
};

export default function CharacterLineEditor({
  activationPath,
  characterName,
  getPeople,
  onActivate,
  onChoose,
  onCreate,
  onTab,
}: CharacterLineEditorProps) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<ScriptPerson[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const personRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const openPicker = useCallback(() => {
    onActivate();
    setName("");
    setPeople(getPeople());
    setOpen(true);
  }, [getPeople, onActivate]);

  useEffect(
    () =>
      subscribeScriptNodeSelector(
        "character",
        activationPath,
        openPicker,
      ),
    [activationPath, openPicker],
  );

  const choosePerson = (person: ScriptPerson) => {
    setOpen(false);
    setName("");
    onChoose(person);
  };

  const createPerson = () => {
    const nextName = name.trim();
    if (!nextName) return;

    const existingPerson = people.find(
      (person) =>
        person.name.toLocaleLowerCase() === nextName.toLocaleLowerCase(),
    );
    choosePerson(existingPerson ?? onCreate(nextName));
  };

  return (
    <Popover.Root
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          openPicker();
        } else {
          setOpen(false);
        }
      }}
      open={open}
    >
      <Popover.Trigger asChild>
        <button
          aria-label={characterName ? `角色：${characterName}` : "选择角色"}
          className="screenplay-field-trigger screenplay-character-trigger"
          contentEditable={false}
          data-active={open}
          data-empty={!characterName}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            setOpen(false);
            onTab(event.shiftKey ? -1 : 1);
          }}
          type="button"
        >
          {characterName || "角色"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="center"
          className="screenplay-character-line-editor"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }}
          sideOffset={6}
        >
          <div className="screenplay-character-line-editor__list">
            {people.length ? (
              people.map((person, index) => (
                <button
                  className="screenplay-character-line-editor__person"
                  key={person.id}
                  onClick={() => choosePerson(person)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      personRefs.current[
                        Math.min(index + 1, people.length - 1)
                      ]?.focus();
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (index === 0) inputRef.current?.focus();
                      else personRefs.current[index - 1]?.focus();
                    } else if (event.key === "Tab") {
                      event.preventDefault();
                      if (event.shiftKey) {
                        setOpen(false);
                        onTab(-1);
                      } else {
                        choosePerson(person);
                      }
                    }
                  }}
                  ref={(element) => {
                    personRefs.current[index] = element;
                  }}
                  type="button"
                >
                  {person.name}
                </button>
              ))
            ) : (
              <div className="screenplay-character-line-editor__empty">
                输入姓名创建第一个角色
              </div>
            )}
          </div>
          <form
            className="screenplay-character-line-editor__form"
            onSubmit={(event) => {
              event.preventDefault();
              createPerson();
            }}
          >
            <input
              aria-label="角色姓名"
              className="screenplay-character-line-editor__input"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && people.length) {
                  event.preventDefault();
                  personRefs.current[0]?.focus();
                } else if (event.key === "Tab") {
                  event.preventDefault();
                  if (!event.shiftKey && name.trim()) {
                    createPerson();
                  } else {
                    setOpen(false);
                    onTab(event.shiftKey ? -1 : 1);
                  }
                }
              }}
              placeholder="输入角色姓名"
              ref={inputRef}
              value={name}
            />
            <button
              className="screenplay-character-line-editor__submit"
              disabled={!name.trim()}
              type="submit"
            >
              确定
            </button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
