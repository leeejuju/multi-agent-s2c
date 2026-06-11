import {
  BookOpen,
  ChevronRight,
  Clapperboard,
  FileText,
  GitBranch,
  ListTree,
  Loader2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import {
  libraryApi,
  type CharacterNode,
  type ScreenplayItem,
} from "@/api/library";
import "./WorkStudioPanel.css";

type WorkStudioPanelProps = {
  onClose: () => void;
  open: boolean;
};

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

function getWorkSections(work: ScreenplayItem | null): WorkSection[] {
  if (!work) return [];

  const structured = work as WorkWithStructure;
  return structured.chapters || structured.scenes || [];
}

function getWorkShots(work: ScreenplayItem | null): WorkShot[] {
  if (!work) return [];

  const structured = work as WorkWithStructure;
  return structured.shots || structured.storyboards || [];
}

function getSectionShots(
  work: ScreenplayItem | null,
  section?: WorkSection,
): WorkShot[] {
  const shots = getWorkShots(work);
  if (!section) return shots;

  const shotIds = new Set(section.shot_ids || []);
  const scoped = shots.filter(
    (shot) =>
      shotIds.has(shot.id) ||
      shot.chapter_id === section.id ||
      shot.scene_id === section.id,
  );
  return scoped.length > 0 ? scoped : shots.slice(0, 6);
}

function getCharacterName(characters: CharacterNode[], id: string) {
  return characters.find((character) => character.id === id)?.name || id;
}

export default function WorkStudioPanel({ onClose, open }: WorkStudioPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const [works, setWorks] = useState<ScreenplayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);
    void libraryApi
      .getScreenplays()
      .then((items) => {
        if (!mounted) return;
        setWorks(items);
        setSelectedWorkId((current) =>
          current && items.some((item) => item.id === current)
            ? current
            : items[0]?.id || null,
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const selectedWork = useMemo(
    () => works.find((item) => item.id === selectedWorkId) || works[0] || null,
    [selectedWorkId, works],
  );
  const sections = useMemo(() => getWorkSections(selectedWork), [selectedWork]);
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) || sections[0];
  const sectionCharacters = selectedSection?.character_ids?.length
    ? selectedWork?.characters.filter((character) =>
        selectedSection.character_ids?.includes(character.id),
      ) || []
    : selectedWork?.characters || [];
  const sectionShots = getSectionShots(selectedWork, selectedSection);
  const selectedCharacter = selectedWork?.characters.find(
    (character) => character.id === selectedCharacterId,
  );

  useEffect(() => {
    setSelectedSectionId(sections[0]?.id || null);
  }, [selectedWork?.id, sections]);

  useEffect(() => {
    setSelectedCharacterId(undefined);
  }, [selectedWork?.id, selectedSection?.id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          aria-label="Script Studio"
          className="work-studio-panel"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: shouldReduceMotion ? 0.08 : 0.16, ease: "easeOut" }}
        >
          <header className="work-studio-header">
            <div className="work-studio-title">
              <span>Works</span>
              <h2>Script Studio</h2>
            </div>
            <button
              aria-label="Close script studio"
              className="work-studio-icon-btn"
              onClick={onClose}
              title="Close"
              type="button"
            >
              <X size={15} />
            </button>
          </header>

          {loading ? (
            <div className="work-studio-state">
              <Loader2 className="spin" size={18} />
              <span>Loading works</span>
            </div>
          ) : !selectedWork ? (
            <div className="work-studio-empty">
              <BookOpen size={22} />
              <h3>No works yet</h3>
              <p>Imported scripts and screenplay files will appear here as structured work material.</p>
            </div>
          ) : (
            <div className="work-studio-layout">
              <aside className="work-studio-works">
                <div className="work-studio-section-label">
                  <BookOpen size={13} />
                  <span>Works</span>
                </div>
                <div className="work-studio-work-list">
                  {works.map((work) => (
                    <button
                      className={
                        work.id === selectedWork.id
                          ? "work-studio-work-row is-active"
                          : "work-studio-work-row"
                      }
                      key={work.id}
                      onClick={() => setSelectedWorkId(work.id)}
                      type="button"
                    >
                      <span>{work.genre}</span>
                      <strong>{work.title}</strong>
                      <small>
                        {work.characters.length} characters / {work.relationships.length} links
                      </small>
                    </button>
                  ))}
                </div>
              </aside>

              <main className="work-studio-main">
                <section className="work-studio-overview">
                  <div className="work-studio-overview-copy">
                    <span>{selectedWork.genre}</span>
                    <h3>{selectedWork.title}</h3>
                    <p>{selectedWork.summary || "No summary available yet."}</p>
                  </div>
                  <div className="work-studio-metrics">
                    <span>{sections.length} sections</span>
                    <span>{selectedWork.characters.length} characters</span>
                    <span>{sectionShots.length} shots</span>
                  </div>
                </section>

                <section className="work-studio-grid">
                  <div className="work-studio-pane work-studio-chapters">
                    <div className="work-studio-pane-title">
                      <ListTree size={13} />
                      <span>Chapters / Scenes</span>
                    </div>
                    {sections.length > 0 ? (
                      <div className="work-studio-section-list">
                        {sections.map((section) => (
                          <button
                            className={
                              section.id === selectedSection?.id
                                ? "work-studio-section-row is-active"
                                : "work-studio-section-row"
                            }
                            key={section.id}
                            onClick={() => setSelectedSectionId(section.id)}
                            type="button"
                          >
                            <span>{section.pov || "Section"}</span>
                            <strong>{section.title}</strong>
                            <small>{section.summary || "No summary yet"}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="work-studio-mini-empty">
                        <FileText size={16} />
                        <span>Chapter index will appear after parsing.</span>
                      </div>
                    )}
                  </div>

                  <div className="work-studio-pane work-studio-graph">
                    <div className="work-studio-pane-title">
                      <GitBranch size={13} />
                      <span>Current Section Map</span>
                    </div>
                    {sectionCharacters.length > 0 ? (
                      <div className="work-studio-mini-empty">
                        <GitBranch size={16} />
                        <span>
                          Character map visualization has been removed. Open a section to view links
                          in the inspector.
                        </span>
                      </div>
                    ) : (
                      <div className="work-studio-mini-empty">
                        <GitBranch size={16} />
                        <span>No characters available for this section.</span>
                      </div>
                    )}
                  </div>

                  <div className="work-studio-pane work-studio-characters">
                    <div className="work-studio-pane-title">
                      <Users size={13} />
                      <span>Section Characters</span>
                    </div>
                    {sectionCharacters.length > 0 ? (
                      <div className="work-studio-character-list">
                        {sectionCharacters.map((character) => (
                          <button
                            className={
                              character.id === selectedCharacterId
                                ? "work-studio-character-row is-active"
                                : "work-studio-character-row"
                            }
                            key={character.id}
                            onClick={() => setSelectedCharacterId(character.id)}
                            type="button"
                          >
                            <span>{character.name}</span>
                            <small>{character.role}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="work-studio-mini-empty">
                        <Users size={16} />
                        <span>No characters attached to this section yet.</span>
                      </div>
                    )}
                  </div>

                  <div className="work-studio-pane work-studio-shots">
                    <div className="work-studio-pane-title">
                      <Clapperboard size={13} />
                      <span>Storyboard / Shots</span>
                    </div>
                    {sectionShots.length > 0 ? (
                      <div className="work-studio-shot-list">
                        {sectionShots.map((shot, index) => (
                          <article className="work-studio-shot-row" key={shot.id}>
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
                      <div className="work-studio-mini-empty">
                        <Clapperboard size={16} />
                        <span>Storyboard shots will appear here.</span>
                      </div>
                    )}
                  </div>

                  <aside className="work-studio-pane work-studio-inspector">
                    <div className="work-studio-pane-title">
                      <ChevronRight size={13} />
                      <span>Inspector</span>
                    </div>
                    {selectedCharacter ? (
                      <div className="work-studio-inspector-body">
                        <span>Selected character</span>
                        <h4>{selectedCharacter.name}</h4>
                        <p>{selectedCharacter.role}</p>
                        <div className="work-studio-link-list">
                          {selectedWork.relationships
                            .filter(
                              (relationship) =>
                                relationship.source_id === selectedCharacter.id ||
                                relationship.target_id === selectedCharacter.id,
                            )
                            .map((relationship) => {
                              const peerId =
                                relationship.source_id === selectedCharacter.id
                                  ? relationship.target_id
                                  : relationship.source_id;
                              return (
                                <span key={relationship.id}>
                                  {relationship.label} /{" "}
                                  {getCharacterName(selectedWork.characters, peerId)}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    ) : selectedSection ? (
                      <div className="work-studio-inspector-body">
                        <span>Selected section</span>
                        <h4>{selectedSection.title}</h4>
                        <p>{selectedSection.summary || "No summary yet."}</p>
                      </div>
                    ) : (
                      <div className="work-studio-mini-empty">
                        <span>Select a character or section.</span>
                      </div>
                    )}
                  </aside>
                </section>
              </main>
            </div>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
