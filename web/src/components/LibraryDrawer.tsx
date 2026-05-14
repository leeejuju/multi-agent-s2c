import {
  BookOpen,
  Clapperboard,
  Film,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import {
  libraryApi,
  type DrawingScriptItem,
  type LibraryStatus,
  type ScreenplayItem,
} from "@/api/library";
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
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatus | "all">("all");
  const [drawingScripts, setDrawingScripts] = useState<DrawingScriptItem[]>([]);
  const [screenplays, setScreenplays] = useState<ScreenplayItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          aria-modal="true"
          className="library-overlay pointer-events-auto"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          role="dialog"
          transition={{ duration: 0.18 }}
        >
          <button
            aria-label="Close library"
            className="library-scrim"
            onClick={onClose}
            type="button"
          />

          <motion.section
            className="library-drawer"
            exit={{ opacity: 0, scale: 0.98, y: 24 }}
            initial={{ opacity: 0, scale: 0.98, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <header className="library-header">
              <div>
                <span className="library-eyebrow">Creative Library</span>
                <h2>Production Assets</h2>
              </div>
              <button
                aria-label="Close library"
                className="library-icon-btn"
                onClick={onClose}
                title="Close"
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <div className="library-controls">
              <div className="library-tabs" role="tablist">
                <button
                  aria-selected={activeTab === "drawing-scripts"}
                  className={activeTab === "drawing-scripts" ? "is-active" : ""}
                  onClick={() => setActiveTab("drawing-scripts")}
                  role="tab"
                  type="button"
                >
                  <Clapperboard size={16} />
                  <span>Drawing Scripts</span>
                </button>
                <button
                  aria-selected={activeTab === "screenplays"}
                  className={activeTab === "screenplays" ? "is-active" : ""}
                  onClick={() => setActiveTab("screenplays")}
                  role="tab"
                  type="button"
                >
                  <BookOpen size={16} />
                  <span>Screenplays</span>
                </button>
              </div>

              <label className="library-search">
                <Search size={16} />
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search library"
                  value={query}
                />
              </label>

              <div className="library-filter">
                <SlidersHorizontal size={15} />
                <select
                  onChange={(event) =>
                    setStatusFilter(event.target.value as LibraryStatus | "all")
                  }
                  value={statusFilter}
                >
                  {filters.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === "all" ? "All status" : statusLabels[filter]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeTab === "drawing-scripts" ? (
              <DrawingScriptLibrary
                items={filteredDrawingScripts}
                loading={loading}
              />
            ) : (
              <ScreenplayLibrary items={filteredScreenplays} loading={loading} />
            )}
          </motion.section>
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
    return <LibraryEmptyState label="Loading drawing scripts" />;
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
              <Film size={26} />
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
    return <LibraryEmptyState label="Loading screenplays" />;
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
      <span>{label}</span>
    </div>
  );
}

