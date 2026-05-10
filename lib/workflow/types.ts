export type VideoStyleId = "studio" | "ugc" | "cinematic" | "technical";

export type WorkflowStage = "intake" | "shotlist" | "miro" | "video";

export type ProductPhoto = {
  id: string;
  name: string;
  url: string;
};

export type ProductBrief = {
  productName: string;
  description: string;
  audience: string;
  style: VideoStyleId;
  photos: ProductPhoto[];
};

export type Shot = {
  id: string;
  title: string;
  durationSeconds: number;
  framing: string;
  motion: string;
  prompt: string;
  assets: string[];
};

export type Shotlist = {
  id: string;
  productName: string;
  style: VideoStyleId;
  concept: string;
  targetDurationSeconds: number;
  visualFeatureCount: number;
  shots: Shot[];
  createdAt: string;
};

export type MiroBoardResult = {
  boardId: string;
  boardUrl: string | null;
  status: "mocked" | "created";
  provider: "miro-mcp";
  itemCount: number;
  itemIds: string[];
  tools?: string[];
  message: string;
};

export type VideoJobResult = {
  jobId: string;
  status: "created" | "queued" | "mocked";
  previewUrl: string | null;
  clips?: VideoClipResult[];
  targetDurationSeconds?: number;
  message: string;
};

export type VideoClipResult = {
  id: string;
  title: string;
  durationSeconds: number;
  previewUrl: string;
};
