import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import {
    DEFAULT_MODEL_ID,
    MODEL_PRESETS,
    ModelProvider,
    ModelPreset,
} from "@/lib/model-constants";

const presetMap = new Map(MODEL_PRESETS.map((preset) => [preset.id, preset]));
const presetIdLookup = new Map(
    MODEL_PRESETS.map((preset) => [preset.id.toLowerCase(), preset.id])
);

const WANQING_DEFAULT_API_KEY = "f6sd4fz86b7ix4rabui9d69r3kmaiawkaa12";
const wanqingApiKey =
    process.env.WQ_API_KEY && process.env.WQ_API_KEY.length > 0
        ? process.env.WQ_API_KEY
        : WANQING_DEFAULT_API_KEY;
const WANQING_BASE_URL =
    process.env.WQ_API_BASE_URL ??
    "https://wanqing-api.corp.kuaishou.com/api/agent/v1/apps";
const WANQING_MODEL_ID =
    process.env.WQ_MODEL_ID ?? "app-dbcwt0-1750310518239209222";

const wanqingClient = createOpenAI({
    apiKey: wanqingApiKey,
    baseURL: WANQING_BASE_URL,
});

export interface ResolvedModel {
    id: string;
    label: string;
    description?: string;
    provider: ModelProvider;
    slug: string;
    model: any;
}

const presetFactories: Record<
    string,
    () => { model: any; slug: string }
> = {
    "wanqing-flowpilot": () => ({
        model: wanqingClient.chat(WANQING_MODEL_ID),
        slug: WANQING_MODEL_ID,
    }),
    "wanqing-flowpilot-v2": () => ({
        model: wanqingClient.chat(WANQING_MODEL_ID), // 暂时使用相同的模型ID
        slug: WANQING_MODEL_ID,
    }),
    "wanqing-flowpilot-fast": () => ({
        model: wanqingClient.chat(WANQING_MODEL_ID), // 暂时使用相同的模型ID
        slug: WANQING_MODEL_ID,
    }),
};

export function resolveChatModel(requestedId?: string): ResolvedModel {
    const rawId = (requestedId ?? DEFAULT_MODEL_ID).trim();
    const lowerId = rawId.toLowerCase();
    const normalizedId = presetIdLookup.get(lowerId) ?? lowerId;

    if (presetFactories[normalizedId]) {
        const meta = presetMap.get(normalizedId) as ModelPreset | undefined;
        const { model, slug } = presetFactories[normalizedId]();
        return {
            id: normalizedId,
            label: meta?.label ?? normalizedId,
            description: meta?.description,
            provider: meta?.provider ?? "wanqing",
            slug,
            model,
        };
    }

    // 如果没有找到预设模型，返回默认模型
    const defaultMeta = presetMap.get(DEFAULT_MODEL_ID) as ModelPreset | undefined;
    const { model, slug } = presetFactories[DEFAULT_MODEL_ID]();
    return {
        id: DEFAULT_MODEL_ID,
        label: defaultMeta?.label ?? DEFAULT_MODEL_ID,
        description: defaultMeta?.description,
        provider: "wanqing",
        slug,
        model,
    };
}
