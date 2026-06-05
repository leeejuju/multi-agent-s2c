import {
  BookOpen,
  Clapperboard,
  Film,
  Users,
  X,
} from "lucide-react";
import { Empty, Input, Select, Spin, Tabs } from "antd";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PointerEvent, useEffect, useMemo, useState } from "react";

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
import CharacterRelationshipGraph from "@/components/CharacterRelationshipGraph";
import "./LibraryDrawer.css";

type LibraryTab = "drawing-scripts" | "screenplays";

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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tabItems = [
    {
      key: "drawing-scripts",
      label: (
        <span className="inline-flex items-center gap-2">
          <Clapperboard size={15} />
          Drawing Scripts
        </span>
      ),
    },
    {
      key: "screenplays",
      label: (
        <span className="inline-flex items-center gap-2">
          <BookOpen size={15} />
          Screenplays
        </span>
      ),
    },
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

  const handleDragStart = (event: PointerEvent<HTMLElement>) => {
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
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
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
              <header className="library-header" onPointerDown={handleDragStart}>
                <div className="library-drag-handle" />
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

              <div className="library-controls">
                <Tabs
                  activeKey={activeTab}
                  items={tabItems}
                  onChange={(key) => setActiveTab(key as LibraryTab)}
                />

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
              </div>

              {activeTab === "drawing-scripts" ? (
                <DrawingScriptLibrary items={filteredDrawingScripts} loading={loading} />
              ) : (
                <ScreenplayLibrary items={filteredScreenplays} loading={loading} />
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
}: {
  items: ScreenplayItem[];
  loading: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>();

  useEffect(() => {
    setSelectedId((current) =>
      current && items.some((item) => item.id === current)
        ? current
        : items[0]?.id || null,
    );
    setSelectedCharacterId(undefined);
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
            type="button"
          >
            <span>{item.genre}</span>
            <strong>{item.title}</strong>
            <small>{statusLabels[item.status]}</small>
          </button>
        ))}
      </div>

      <article className="screenplay-detail">
        <div className="screenplay-detail-header">
          <div>
            <span>{selected.genre}</span>
            <h3>{selected.title}</h3>
          </div>
          <div className="screenplay-count">
            <Users size={16} />
            <span>{selected.characters.length}</span>
          </div>
        </div>

        <p>{selected.summary}</p>

        <CharacterRelationshipGraph
          characters={selected.characters}
          relationships={selected.relationships}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={setSelectedCharacterId}
        />
      </article>
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
