import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

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

const googleClient = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
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
    "app-dbcwt0-1750310518239209222": () => ({
        model: wanqingClient.chat(WANQING_MODEL_ID),
        slug: WANQING_MODEL_ID,
    }),
};

export function resolveChatModel(requestedId?: string): ResolvedModel {
    const rawId = (requestedId ?? DEFAULT_MODEL_ID).trim();
    const lowerId = rawId.toLowerCase();
    const normalizedId = presetIdLookup.get(lowerId) ?? rawId; // 使用原始ID而不是小写版本

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

    // 如果没有找到预设模型，使用自定义模型ID直接调用wanqing API
    return {
        id: rawId,
        label: rawId,
        description: "自定义模型",
        provider: "wanqing",
        slug: rawId,
        model: wanqingClient.chat(rawId),
    };
}
