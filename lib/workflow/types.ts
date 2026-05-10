export type VideoStyleId = "studio" | "ugc" | "cinematic" | "technical";

export type WorkflowStage = "intake" | "miro" | "image-shotlist" | "video";

export type WorkflowRunStatus = "idle" | "running" | "ready" | "error";

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
  startImageUrl?: string;
  sourceImageUrls?: string[];
  imagePrompt?: string;
  videoPrompt?: string;
  imageStatus?: WorkflowRunStatus;
  imageError?: string;
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

export type MiroBoardContext = {
  boardUrl: string | null;
  tools: string[];
  text: string;
  items: MiroBoardContextItem[];
  imageUrls: string[];
  raw: unknown[];
};

export type MiroBoardContextItem = {
  id?: string;
  type?: string;
  title?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
};

export type ImageShotlistResult = {
  shotlist: Shotlist;
  boardContext: MiroBoardContext;
  imageStatus: "mocked" | "created";
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
