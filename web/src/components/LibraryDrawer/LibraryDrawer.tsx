import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clapperboard,
  FileText,
  FileUp,
  Film,
  GitBranch,
  ListTree,
  Users,
  X,
} from "lucide-react";
import { Empty, Input, Select, Spin } from "antd";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  libraryApi,
  type DrawingScriptItem,
  type LibraryStatus,
  type ScreenplayItem,
} from "@/api/library";
import {
  getLibraryPanelMotion,
  libraryOverlayMotion,
} from "@/assets/animations/LibraryDrawer.motion";
import "./LibraryDrawer.css";

type LibraryTab = "drawing-scripts" | "screenplays";

type WorkSection = {
  id: string;
  title: string;
  pov?: string;
  summary?: string;
  character_ids?: string[];
  shot_ids?: string[];
};

type WorkShot = {
  id: string;
  title?: string;
  scene_id?: string;
  chapter_id?: string;
  description?: string;
  camera?: string;
  visual_focus?: string;
};

type WorkWithStructure = ScreenplayItem & {
  chapters?: WorkSection[];
  scenes?: WorkSection[];
  shots?: WorkShot[];
  storyboards?: WorkShot[];
};

type LibraryDrawerProps = {
  initialTab?: LibraryTab;
  onClose: () => void;
  open: boolean;
};

const statusLabels: Record<LibraryStatus, string> = {
  archived: "Archived",
  draft: "Draft",
  ready: "Ready",
  review: "Review",
};

const filters: Array<LibraryStatus | "all"> = [
  "all",
  "draft",
  "review",
  "ready",
  "archived",
];

function getWorkSections(work: ScreenplayItem): WorkSection[] {
  const structured = work as WorkWithStructure;
  return structured.chapters || structured.scenes || [];
}

function getWorkShots(work: ScreenplayItem): WorkShot[] {
  const structured = work as WorkWithStructure;
  return structured.shots || structured.storyboards || [];
}

function getSectionShots(work: ScreenplayItem, section?: WorkSection): WorkShot[] {
  const shots = getWorkShots(work);
  if (!section) return shots;

  const shotIds = new Set(section.shot_ids || []);
  const scoped = shots.filter(
    (shot) =>
      shotIds.has(shot.id) ||
      shot.chapter_id === section.id ||
      shot.scene_id === section.id,
  );
  return scoped.length > 0 ? scoped : shots.slice(0, 8);
}

export default function LibraryDrawer({
  initialTab = "drawing-scripts",
  onClose,
  open,
}: LibraryDrawerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatus | "all">("all");
  const [drawingScripts, setDrawingScripts] = useState<DrawingScriptItem[]>([]);
  const [screenplays, setScreenplays] = useState<ScreenplayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tabItems: Array<{
    icon: typeof Clapperboard;
    key: LibraryTab;
    label: string;
  }> = [
    { icon: Clapperboard, key: "drawing-scripts", label: "Drawing Scripts" },
    { icon: BookOpen, key: "screenplays", label: "Screenplays" },
  ];

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);
    void Promise.all([
      libraryApi.getDrawingScripts(),
      libraryApi.getScreenplays(),
    ])
      .then(([nextDrawingScripts, nextScreenplays]) => {
        if (!mounted) return;
        setDrawingScripts(nextDrawingScripts);
        setScreenplays(nextScreenplays);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const searchValue = query.trim().toLowerCase();
  const filteredDrawingScripts = useMemo(
    () =>
      drawingScripts.filter((item) => {
        const matchesStatus =
          statusFilter === "all" || item.status === statusFilter;
        const matchesSearch =
          !searchValue ||
          item.title.toLowerCase().includes(searchValue) ||
          item.project_name.toLowerCase().includes(searchValue) ||
          item.style_tags.some((tag) => tag.toLowerCase().includes(searchValue));
        return matchesStatus && matchesSearch;
      }),
    [drawingScripts, searchValue, statusFilter],
  );

  const filteredScreenplays = useMemo(
    () =>
      screenplays.filter((item) => {
        const matchesStatus =
          statusFilter === "all" || item.status === statusFilter;
        const matchesSearch =
          !searchValue ||
          item.title.toLowerCase().includes(searchValue) ||
          item.genre.toLowerCase().includes(searchValue) ||
          item.summary.toLowerCase().includes(searchValue) ||
          item.characters.some((character) =>
            character.name.toLowerCase().includes(searchValue),
          );
        return matchesStatus && matchesSearch;
      }),
    [screenplays, searchValue, statusFilter],
  );
  const activeWork = useMemo(
    () => screenplays.find((item) => item.id === activeWorkId) || null,
    [activeWorkId, screenplays],
  );
  const visibleCount =
    activeTab === "drawing-scripts"
      ? filteredDrawingScripts.length
      : filteredScreenplays.length;
  const totalCount =
    activeTab === "drawing-scripts" ? drawingScripts.length : screenplays.length;
  const countLabel =
    activeTab === "drawing-scripts"
      ? `${visibleCount}/${totalCount} scripts`
      : `${visibleCount}/${totalCount} works`;

  useEffect(() => {
    if (activeTab !== "screenplays") setActiveWorkId(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeWorkId && !screenplays.some((item) => item.id === activeWorkId)) {
      setActiveWorkId(null);
    }
  }, [activeWorkId, screenplays]);

  const handleDragStart = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = position;

    event.currentTarget.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      setPosition({
        x: startPosition.x + moveEvent.clientX - startX,
        y: startPosition.y + moveEvent.clientY - startY,
      });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  const handleImportFiles = async (files: FileList | null) => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return;

    setImporting(true);
    setImportError("");
    try {
      const imported = await libraryApi.importScreenplays(selectedFiles);
      setScreenplays((current) => {
        const importedIds = new Set(imported.map((item) => item.id));
        return [
          ...imported,
          ...current.filter((item) => !importedIds.has(item.id)),
        ];
      });
      setActiveTab("screenplays");
      setStatusFilter("all");
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Import failed",
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const panelMotion = getLibraryPanelMotion(shouldReduceMotion);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="library-floating-overlay"
          onClick={onClose}
          {...libraryOverlayMotion}
        >
          <motion.div
            className="library-floating-shell"
            onClick={(event) => event.stopPropagation()}
            style={{ originX: 0, originY: 0.55 }}
            {...panelMotion}
          >
            <section
              aria-modal="true"
              className="library-floating-panel pointer-events-auto"
              role="dialog"
              style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            >
              <input
                accept=".txt,.md,.markdown,.docx,.html,.htm,.json,.csv,.xls,.xlsx,.pdf,.pptx,application/pdf,application/json,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/xhtml+xml,text/csv,text/html,text/plain,text/markdown"
                className="hidden"
                multiple
                onChange={(event) => void handleImportFiles(event.target.files)}
                ref={fileInputRef}
                type="file"
              />

              <header
                className={activeWork ? "library-topbar is-detail" : "library-topbar"}
                onPointerDown={handleDragStart}
              >
                <div className="library-title-block">
                  <span>{activeWork ? "Screenplay workspace" : "Script desk"}</span>
                  <h2>{activeWork ? "Work Detail" : "Script Library"}</h2>
                  {!activeWork && <small>{countLabel}</small>}
                </div>

                <button
                  aria-label="Close library"
                  className="library-icon-btn"
                  onClick={onClose}
                  onPointerDown={(event) => event.stopPropagation()}
                  title="Close"
                  type="button"
                >
                  <X size={16} />
                </button>
              </header>

              {!activeWork && (
                <div className="library-command-bar">
                  <div className="library-tab-group" role="tablist">
                    {tabItems.map(({ icon: Icon, key, label }) => (
                      <button
                        aria-selected={activeTab === key}
                        className={
                          activeTab === key
                            ? "library-tab-button is-active"
                            : "library-tab-button"
                        }
                        key={key}
                        onClick={() => setActiveTab(key)}
                        role="tab"
                        type="button"
                      >
                        <Icon size={14} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <Input.Search
                    allowClear
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search library"
                    value={query}
                  />

                  <Select
                    onChange={(value) => setStatusFilter(value)}
                    options={filters.map((filter) => ({
                      label: filter === "all" ? "All status" : statusLabels[filter],
                      value: filter,
                    }))}
                    value={statusFilter}
                  />

                  <button
                    className="library-import-btn"
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <FileUp size={14} />
                    <span>{importing ? "Importing" : "Import"}</span>
                  </button>
                </div>
              )}

              {importError && (
                <div className="library-import-error">{importError}</div>
              )}

              {activeWork ? (
                <WorkDetailView
                  item={activeWork}
                  onBack={() => setActiveWorkId(null)}
                />
              ) : activeTab === "drawing-scripts" ? (
                <DrawingScriptLibrary items={filteredDrawingScripts} loading={loading} />
              ) : (
                <ScreenplayLibrary
                  items={filteredScreenplays}
                  loading={loading}
                  onOpenWork={(item) => setActiveWorkId(item.id)}
                />
              )}
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DrawingScriptLibrary({
  items,
  loading,
}: {
  items: DrawingScriptItem[];
  loading: boolean;
}) {
  if (loading) {
    return <LibraryLoadingState label="Loading drawing scripts" />;
  }

  if (items.length === 0) {
    return <LibraryEmptyState label="No drawing scripts" />;
  }

  return (
    <section className="drawing-library-grid">
      {items.map((item) => (
        <article className="drawing-script-card" key={item.id}>
          <div className="drawing-cover">
            {item.cover_url ? (
              <img alt="" src={item.cover_url} />
            ) : (
              <Film size={22} />
            )}
          </div>
          <div className="library-item-body">
            <div className="library-item-heading">
              <span>{item.project_name}</span>
              <strong>{item.title}</strong>
            </div>
            <div className="library-item-meta">
              <span>{item.shot_count} shots</span>
              <span>{statusLabels[item.status]}</span>
            </div>
            <div className="library-tag-row">
              {item.style_tags.slice(0, 4).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function ScreenplayLibrary({
  items,
  loading,
  onOpenWork,
}: {
  items: ScreenplayItem[];
  loading: boolean;
  onOpenWork: (item: ScreenplayItem) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) || items[0];

  useEffect(() => {
    setSelectedId((current) =>
      current && items.some((item) => item.id === current)
        ? current
        : items[0]?.id || null,
    );
  }, [items]);

  if (loading) {
    return <LibraryLoadingState label="Loading screenplays" />;
  }

  if (!selected) {
    return <LibraryEmptyState label="No screenplays" />;
  }

  return (
    <section className="screenplay-library-layout">
      <div className="screenplay-list">
        {items.map((item) => (
          <button
            className={item.id === selected.id ? "screenplay-row is-active" : "screenplay-row"}
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            onDoubleClick={() => onOpenWork(item)}
            type="button"
          >
            <span>{item.genre}</span>
            <strong>{item.title}</strong>
            <small>
              {item.characters.length} characters · {item.relationships.length} links
            </small>
          </button>
        ))}
      </div>

      <article className="screenplay-detail">
        <div className="screenplay-detail-header">
          <div>
            <span>{selected.genre}</span>
            <h3>{selected.title}</h3>
            {selected.source_file_name && (
              <small>
                <FileText size={13} />
                {selected.source_file_name}
              </small>
            )}
          </div>
          <div className="screenplay-count">
            <Users size={16} />
            <span>{selected.characters.length}</span>
          </div>
        </div>

        <p>{selected.summary}</p>

        <div className="screenplay-character-strip" aria-label="Character preview">
          {selected.characters.length > 0 ? (
            selected.characters.slice(0, 8).map((character) => (
              <span className="screenplay-character-preview" key={character.id}>
                {character.name}
              </span>
            ))
          ) : (
            <span className="screenplay-character-empty">
              No characters extracted yet
            </span>
          )}
        </div>

        <button
          className="screenplay-work-entry"
          onClick={() => onOpenWork(selected)}
          type="button"
        >
          <span className="screenplay-work-entry-icon">
            <GitBranch size={15} />
          </span>
          <span className="screenplay-work-entry-copy">
            <span>Work structure</span>
            <small>
              Chapters, character map, and storyboard shots
            </small>
          </span>
          <ChevronRight size={15} />
        </button>
      </article>
    </section>
  );
}

function WorkDetailView({
  item,
  onBack,
}: {
  item: ScreenplayItem;
  onBack: () => void;
}) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const sections = useMemo(() => getWorkSections(item), [item]);
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) || sections[0];
  const sectionCharacters = selectedSection?.character_ids?.length
    ? item.characters.filter((character) =>
        selectedSection.character_ids?.includes(character.id),
      )
    : item.characters;
  const sectionShots = getSectionShots(item, selectedSection);

  useEffect(() => {
    setSelectedCharacterId(undefined);
    setSelectedSectionId(sections[0]?.id || null);
  }, [item.id, sections]);

  useEffect(() => {
    setSelectedCharacterId(undefined);
  }, [selectedSection?.id]);

  return (
    <section className="work-detail-layout">
      <header className="work-detail-header">
        <button className="work-detail-back" onClick={onBack} type="button">
          <ArrowLeft size={14} />
          <span>Library</span>
        </button>
        <div className="work-detail-title-block">
          <span>{item.genre}</span>
          <h3>{item.title}</h3>
        </div>
      </header>

      <div className="work-detail-summary">
        <span>{statusLabels[item.status]}</span>
        <span>{sections.length} sections</span>
        <span>{sectionCharacters.length} section characters</span>
        <span>{sectionShots.length} shots</span>
        {item.source_file_name && <span>{item.source_file_name}</span>}
      </div>

      <div className="work-detail-body">
        <aside className="work-section-list-panel">
          <div className="work-section-title">
            <ListTree size={13} />
            <span>Chapters / Scenes</span>
          </div>
          <div className="work-section-items">
            {sections.length > 0 ? (
              sections.map((section) => (
                <button
                  className={
                    section.id === selectedSection?.id
                      ? "work-section-row is-active"
                      : "work-section-row"
                  }
                  key={section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  type="button"
                >
                  <span>{section.pov || "Section"}</span>
                  <strong>{section.title}</strong>
                  <small>{section.summary || "No summary yet"}</small>
                </button>
              ))
            ) : (
              <span className="work-empty-note">Chapter index will appear after parsing</span>
            )}
          </div>
        </aside>

        <section className="work-graph-panel">
          <div className="work-section-title">
            <GitBranch size={13} />
            <span>Current Section Map</span>
          </div>
          {sectionCharacters.length > 0 ? (
            <div className="work-empty-note">
              Character map visualization has been removed. Use section character list below.
            </div>
          ) : (
            <div className="work-empty-note">No characters for section-level map.</div>
          )}
        </section>

        <aside className="work-character-list">
          <div className="work-section-title">
            <Users size={13} />
            <span>Section Characters</span>
          </div>
          <div className="work-character-items">
            {sectionCharacters.length > 0 ? (
              sectionCharacters.map((character) => (
                <button
                  className={
                    selectedCharacterId === character.id
                      ? "work-character-row is-active"
                      : "work-character-row"
                  }
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  type="button"
                >
                  <span>{character.name}</span>
                  <small>{character.role}</small>
                </button>
              ))
            ) : (
              <span className="work-empty-note">No characters attached to this section</span>
            )}
          </div>
        </aside>

        <section className="work-shot-panel">
          <div className="work-section-title">
            <Clapperboard size={13} />
            <span>Storyboard / Shots</span>
          </div>
          {sectionShots.length > 0 ? (
            <div className="work-shot-items">
              {sectionShots.map((shot, index) => (
                <article className="work-shot-row" key={shot.id}>
                  <span>Shot {index + 1}</span>
                  <strong>{shot.title || shot.camera || "Untitled shot"}</strong>
                  <small>
                    {shot.description ||
                      shot.visual_focus ||
                      "Shot notes will appear after storyboard parsing."}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <span className="work-empty-note">Storyboard shots will appear here</span>
          )}
        </section>
      </div>
    </section>
  );
}

function LibraryEmptyState({ label }: { label: string }) {
  return (
    <div className="library-empty-state">
      <Empty description={label} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </div>
  );
}

function LibraryLoadingState({ label }: { label: string }) {
  return (
    <div className="library-empty-state">
      <Spin tip={label} />
    </div>
  );
}
