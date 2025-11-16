import { z } from "zod";

export const styleOverridesSchema = z.object({
    palette: z.array(z.string()).default([]),
    typography: z.string().optional(),
    iconography: z.string().optional(),
    layoutTone: z.string().optional(),
});

export const pptBriefSchema = z.object({
    topic: z.string().min(3, "请描述演示主题"),
    audience: z.string().min(2, "请描述目标听众"),
    goal: z.enum(["inform", "pitch", "training", "report"]),
    tone: z.enum(["formal", "balanced", "energetic"]),
    slideCount: z.number().int().min(3).max(30),
    keywords: z.array(z.string()).default([]),
    narrativeFocus: z.string().optional(),
    referenceAssets: z.array(z.string()).default([]),
    constraints: z
        .object({
            palette: z.array(z.string()).default([]),
            forbidden: z.array(z.string()).default([]),
            mustInclude: z.array(z.string()).default([]),
        })
        .default({
            palette: [],
            forbidden: [],
            mustInclude: [],
        }),
});

export const slideBlueprintSchema = z.object({
    id: z.string(),
    title: z.string().min(1),
    narrative: z.string().min(1),
    bullets: z.array(z.string()).default([]),
    visualIdea: z.string().min(1),
    transitionNote: z.string().optional(),
    status: z.enum(["draft", "edited"]).default("draft"),
});

export const blueprintSchema = z.object({
    storyArc: z.string().min(1),
    themeGuidelines: z.object({
        palette: z.array(z.string()).default([]),
        typography: z.string(),
        iconography: z.string().optional(),
        layoutPrinciples: z.array(z.string()).default([]),
    }),
    slides: z.array(slideBlueprintSchema).min(1),
});

export const slideJobResultSchema = z.object({
    xml: z.string(),
    reasoning: z.string().optional(),
    previewUrl: z.string().optional().nullable(),
});

export const slideJobSchema = z.object({
    slideId: z.string(),
    prompt: z.string().optional(),
    seedXml: z.string().optional(),
    status: z.enum(["idle", "queued", "generating", "ready", "failed"]),
    startedAt: z.number().optional(),
    finishedAt: z.number().optional(),
    error: z.string().optional(),
    result: slideJobResultSchema.optional(),
});

export type PptBrief = z.infer<typeof pptBriefSchema>;
export type SlideBlueprint = z.infer<typeof slideBlueprintSchema>;
export type PptBlueprint = z.infer<typeof blueprintSchema>;
export type SlideJob = z.infer<typeof slideJobSchema>;
export type SlideJobResult = z.infer<typeof slideJobResultSchema>;
export type StyleOverrides = z.infer<typeof styleOverridesSchema>;

export type PptStudioStep = "brief" | "blueprint" | "render";
