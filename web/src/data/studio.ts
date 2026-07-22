export interface Character {
  id: string;
  name: string;
  role: string;
  motivation: string;
  conflict: string;
  description: string;
}

export interface ScriptItem {
  id: string;
  title: string;
  description: string;
  content: string;
  characters: Character[];
  lastEdited: string;
  createdAt: string;
  isTrash?: boolean;
}

export interface VideoScene {
  id: string;
  title: string;
  scriptText: string;
  imageUrl: string;
}

export interface VideoProject {
  id: string;
  title: string;
  description: string;
  aspectRatio: "16:9" | "9:16" | "4:3" | "1:1";
  scenes: VideoScene[];
  lastEdited: string;
  createdAt: string;
  isTrash?: boolean;
}
