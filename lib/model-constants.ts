export type ModelProvider = "wanqing" | "google" | "openrouter";

export interface ModelPreset {
    id: string;
    label: string;
    description: string;
    provider: ModelProvider;
    default?: boolean;
    recommended?: boolean;
}

export const MODEL_PRESETS: ModelPreset[] = [
    {
        id: "app-dbcwt0-1750310518239209222",
        label: "FlowPilot · 默认模型",
        description: "默认模型，支持 FlowPilot 的图表重排与策略输出。",
        provider: "wanqing",
        default: true,
        recommended: true,
    },
];

export const DEFAULT_MODEL_ID =
    MODEL_PRESETS.find((preset) => preset.default)?.id ?? MODEL_PRESETS[0].id;
