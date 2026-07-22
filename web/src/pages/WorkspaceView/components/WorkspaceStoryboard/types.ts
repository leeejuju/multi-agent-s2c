export type StoryboardShotSize =
  | "wide"
  | "full"
  | "medium"
  | "close"
  | "detail";

export type StoryboardCameraMovement =
  | "static"
  | "push"
  | "pull"
  | "pan"
  | "track"
  | "follow";

export type StoryboardFrame = {
  description: string;
  id: string;
  imageUrl?: string;
  movement?: StoryboardCameraMovement;
  shotSize?: StoryboardShotSize;
  title: string;
};

export type StoryboardFrameChange = Partial<
  Omit<StoryboardFrame, "id">
>;
