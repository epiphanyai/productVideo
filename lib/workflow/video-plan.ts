import type { ProductBrief, VideoStyleId } from "@/lib/workflow/types";

export type VideoPlan = {
  targetDurationSeconds: 15 | 30 | 60;
  targetShotCount: 3 | 6 | 12;
  visualFeatureCount: number;
};

const plans: VideoPlan[] = [
  { targetDurationSeconds: 15, targetShotCount: 3, visualFeatureCount: 1 },
  { targetDurationSeconds: 30, targetShotCount: 6, visualFeatureCount: 3 },
  { targetDurationSeconds: 60, targetShotCount: 12, visualFeatureCount: 6 }
];

export function planVideoFromBrief(brief: ProductBrief): VideoPlan {
  return planVideo({
    audience: brief.audience,
    style: brief.style,
    visualFeatureCount: brief.photos.length
  });
}

export function planVideo({
  audience,
  style,
  visualFeatureCount
}: {
  audience: string;
  style: VideoStyleId;
  visualFeatureCount: number;
}): VideoPlan {
  const normalizedFeatureCount = Math.max(1, visualFeatureCount);
  let planIndex = getFeaturePlanIndex(normalizedFeatureCount);

  if (isSocialFirstAudience(audience)) {
    planIndex = Math.max(0, planIndex - 1);
  }

  if (isOlderOrPremiumAudience(audience)) {
    planIndex = Math.min(plans.length - 1, planIndex + 1);
  }

  if ((style === "studio" || style === "cinematic") && normalizedFeatureCount >= 4 && normalizedFeatureCount <= 6) {
    planIndex = 1;
  }

  if (style === "ugc") {
    planIndex = Math.min(planIndex, 1);
  }

  if (style === "technical") {
    planIndex = Math.max(planIndex, 1);
  }

  return {
    ...plans[planIndex],
    visualFeatureCount: normalizedFeatureCount
  };
}

function getFeaturePlanIndex(visualFeatureCount: number) {
  if (visualFeatureCount <= 3) {
    return 0;
  }

  if (visualFeatureCount <= 6) {
    return 1;
  }

  return 2;
}

function isSocialFirstAudience(audience: string) {
  return /\b(tiktok|instagram|reels|shorts|social|creator|gen z|gen-z)\b/i.test(audience);
}

function isOlderOrPremiumAudience(audience: string) {
  return /\b(older|senior|premium|luxury|affluent|executive|professional|enterprise)\b/i.test(audience);
}
