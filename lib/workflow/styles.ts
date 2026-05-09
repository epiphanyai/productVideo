import type { VideoStyleId } from "@/lib/workflow/types";

export type VideoStyleOption = {
  id: VideoStyleId;
  label: string;
  description: string;
};

export const videoStyles: VideoStyleOption[] = [
  {
    id: "studio",
    label: "Studio Launch",
    description: "Clean lighting, controlled camera moves, premium catalog feel."
  },
  {
    id: "ugc",
    label: "UGC Demo",
    description: "Handheld proof points, approachable voice, social-first pacing."
  },
  {
    id: "cinematic",
    label: "Cinematic Mood",
    description: "Dramatic transitions, texture, emotion, and aspirational scenes."
  },
  {
    id: "technical",
    label: "Feature Breakdown",
    description: "Detail inserts, labels, usage steps, and benefit-led sequencing."
  }
];

export function getVideoStyleLabel(style: VideoStyleId) {
  return videoStyles.find((option) => option.id === style)?.label ?? "Custom";
}
