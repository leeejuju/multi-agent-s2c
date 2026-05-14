import { get } from "./index";

export type LibraryStatus = "draft" | "review" | "ready" | "archived";

export interface DrawingScriptItem {
  id: string;
  title: string;
  project_name: string;
  shot_count: number;
  status: LibraryStatus;
  style_tags: string[];
  updated_at: string;
  cover_url?: string | null;
}

export interface CharacterNode {
  id: string;
  name: string;
  role: string;
  archetype?: string | null;
}

export interface CharacterRelationship {
  id: string;
  source_id: string;
  target_id: string;
  label: string;
  strength: number;
}

export interface ScreenplayItem {
  id: string;
  title: string;
  genre: string;
  status: LibraryStatus;
  summary: string;
  updated_at: string;
  characters: CharacterNode[];
  relationships: CharacterRelationship[];
}

async function safeGetList<T>(url: string): Promise<T[]> {
  try {
    return await get<T[]>(url);
  } catch {
    return [];
  }
}

export const libraryApi = {
  getDrawingScripts() {
    return safeGetList<DrawingScriptItem>("/libraries/drawing-scripts");
  },

  getScreenplays() {
    return safeGetList<ScreenplayItem>("/libraries/screenplays");
  },
};

