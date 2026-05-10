import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { getVideoStyleLabel } from "@/lib/workflow/styles";
import type { ProductBrief, Shot, Shotlist } from "@/lib/workflow/types";

const agentShotSchema = z.object({
  title: z.string(),
  durationSeconds: z.number().int().min(2).max(12),
  framing: z.string(),
  motion: z.string(),
  prompt: z.string(),
  assets: z.array(z.string())
});

const shotlistDraftSchema = z.object({
  productName: z.string(),
  concept: z.string(),
  shots: z.array(agentShotSchema).min(4).max(8)
});

const styleDirection = {
  studio: {
    concept: "A polished launch film that makes the product feel precise, desirable, and easy to understand.",
    framing: "Locked-off macro and three-quarter tabletop frames",
    motion: "Slow slider moves with crisp push-ins"
  },
  ugc: {
    concept: "A social-native demo that shows the product solving a real problem in a credible everyday setting.",
    framing: "Handheld medium shots mixed with close detail inserts",
    motion: "Natural handheld moves, quick reframes, and jump cuts"
  },
  cinematic: {
    concept: "A mood-forward product story that connects texture, environment, and payoff.",
    framing: "Low-angle hero frames and shallow-depth closeups",
    motion: "Measured dolly moves, light sweeps, and match cuts"
  },
  technical: {
    concept: "A clear feature walkthrough that turns product details into visual proof points.",
    framing: "Orthographic details, exploded callouts, and step-by-step use angles",
    motion: "Precise pans, pauses for labels, and repeatable interaction beats"
  }
};

const shotlistAgent = new Agent({
  name: "Product Video Shotlist Agent",
  instructions: [
    "Create practical product video shotlists for short-form product videos.",
    "Return only structured output that matches the requested schema.",
    "Write vivid but executable prompts for video generation.",
    "Use uploaded photo names as assets only when they are relevant to a shot.",
    "Keep the plan concise enough for collaborators to review in Miro."
  ].join(" "),
  outputType: shotlistDraftSchema
});

export async function createShotlist(brief: ProductBrief): Promise<Shotlist> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return createMockShotlist(brief);
  }

  const result = await run(
    shotlistAgent,
    JSON.stringify(
      {
        productName: brief.productName,
        description: brief.description,
        audience: brief.audience,
        style: {
          id: brief.style,
          label: getVideoStyleLabel(brief.style),
          direction: styleDirection[brief.style]
        },
        photos: brief.photos.map((photo) => ({
          name: photo.name,
          source: summarizePhotoSource(photo.url)
        }))
      },
      null,
      2
    )
  );

  if (!result.finalOutput) {
    throw new Error("Shotlist agent did not return structured output.");
  }

  return normalizeShotlistDraft(brief, result.finalOutput);
}

function summarizePhotoSource(url: string) {
  if (url.startsWith("data:")) {
    const mimeType = url.match(/^data:([^;,]+)/)?.[1] ?? "image";

    return `${mimeType} uploaded by user`;
  }

  return url;
}

function createMockShotlist(brief: ProductBrief): Shotlist {
  const direction = styleDirection[brief.style];
  const productName = brief.productName.trim() || "Product";
  const audience = brief.audience.trim() || "target customers";
  const photoNames = brief.photos.map((photo) => photo.name);

  const shots: Shot[] = [
    {
      id: "shot-01",
      title: "Hero Reveal",
      durationSeconds: 4,
      framing: direction.framing,
      motion: direction.motion,
      prompt: `Open on ${productName} with a confident reveal. Establish the ${getVideoStyleLabel(
        brief.style
      ).toLowerCase()} tone before any feature detail appears.`,
      assets: photoNames.slice(0, 1)
    },
    {
      id: "shot-02",
      title: "Problem Context",
      durationSeconds: 5,
      framing: "Medium contextual scene with product visible",
      motion: "Smooth cut from environment to product interaction",
      prompt: `Show the moment the intended audience recognizes the need this product solves. Keep ${audience} in mind while keeping the product present without making the shot feel staged.`,
      assets: photoNames.slice(0, 2)
    },
    {
      id: "shot-03",
      title: "Feature Proof",
      durationSeconds: 6,
      framing: "Close detail inserts with room for labels",
      motion: "Push in, hold, then cut to a second angle",
      prompt: `Turn the strongest product detail from the brief into a visual proof point: ${brief.description.slice(
        0,
        180
      )}`,
      assets: photoNames
    },
    {
      id: "shot-04",
      title: "Use Moment",
      durationSeconds: 6,
      framing: "Hands-on or in-context usage frame",
      motion: "One continuous action beat with a clean end pose",
      prompt: `Show ${productName} being used in a way that feels obvious, useful, and specific to ${audience}.`,
      assets: photoNames
    },
    {
      id: "shot-05",
      title: "Final Payoff",
      durationSeconds: 4,
      framing: "Centered packshot with negative space",
      motion: "Slow settle into final composition",
      prompt: `End on ${productName} with a strong final frame suitable for a CTA or logo lockup.`,
      assets: photoNames.slice(0, 1)
    }
  ];

  return {
    id: `shotlist-${Date.now()}`,
    productName,
    style: brief.style,
    concept: direction.concept,
    shots,
    createdAt: new Date().toISOString()
  };
}

function normalizeShotlistDraft(
  brief: ProductBrief,
  draft: z.infer<typeof shotlistDraftSchema>
): Shotlist {
  const productName = draft.productName.trim() || brief.productName.trim() || "Product";

  return {
    id: `shotlist-${Date.now()}`,
    productName,
    style: brief.style,
    concept: draft.concept.trim(),
    shots: draft.shots.map((shot, index) => ({
      id: `shot-${String(index + 1).padStart(2, "0")}`,
      title: shot.title.trim(),
      durationSeconds: shot.durationSeconds,
      framing: shot.framing.trim(),
      motion: shot.motion.trim(),
      prompt: shot.prompt.trim(),
      assets: shot.assets.filter((asset) => asset.trim()).map((asset) => asset.trim())
    })),
    createdAt: new Date().toISOString()
  };
}
