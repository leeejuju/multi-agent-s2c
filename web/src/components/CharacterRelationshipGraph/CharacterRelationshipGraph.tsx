import { useMemo } from "react";

import type {
  CharacterNode,
  CharacterRelationship,
} from "@/api/library";

type CharacterRelationshipGraphProps = {
  characters: CharacterNode[];
  relationships: CharacterRelationship[];
  selectedCharacterId?: string;
  onSelectCharacter?: (id: string) => void;
};

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 360;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2;
const RADIUS_X = 228;
const RADIUS_Y = 118;

export default function CharacterRelationshipGraph({
  characters,
  onSelectCharacter,
  relationships,
  selectedCharacterId,
}: CharacterRelationshipGraphProps) {
  const positionedCharacters = useMemo(() => {
    const count = Math.max(characters.length, 1);
    return characters.map((character, index) => {
      const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
      return {
        ...character,
        x: CENTER_X + Math.cos(angle) * RADIUS_X,
        y: CENTER_Y + Math.sin(angle) * RADIUS_Y,
      };
    });
  }, [characters]);

  const byId = useMemo(
    () =>
      new Map(
        positionedCharacters.map((character) => [character.id, character]),
      ),
    [positionedCharacters],
  );

  if (characters.length === 0) {
    return (
      <div className="relationship-empty">
        <span>No character map</span>
      </div>
    );
  }

  return (
    <div className="relationship-graph">
      <svg
        aria-label="Character relationship graph"
        className="relationship-svg"
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <defs>
          <marker
            id="relationship-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="rgba(26,26,26,0.36)" />
          </marker>
        </defs>

        {relationships.map((relationship) => {
          const source = byId.get(relationship.source_id);
          const target = byId.get(relationship.target_id);
          if (!source || !target) return null;

          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const strokeWidth = 1.4 + Math.min(relationship.strength, 5) * 0.55;
          const isActive =
            selectedCharacterId === source.id || selectedCharacterId === target.id;

          return (
            <g className={isActive ? "relationship-link is-active" : "relationship-link"} key={relationship.id}>
              <line
                markerEnd="url(#relationship-arrow)"
                strokeWidth={strokeWidth}
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
              <text x={midX} y={midY - 8}>
                {relationship.label}
              </text>
            </g>
          );
        })}

        {positionedCharacters.map((character) => {
          const isSelected = selectedCharacterId === character.id;
          return (
            <g
              className={isSelected ? "character-node is-selected" : "character-node"}
              key={character.id}
              onClick={() => onSelectCharacter?.(character.id)}
              role="button"
              tabIndex={0}
            >
              <circle cx={character.x} cy={character.y} r="36" />
              <text className="character-name" x={character.x} y={character.y - 2}>
                {character.name}
              </text>
              <text className="character-role" x={character.x} y={character.y + 16}>
                {character.role}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

