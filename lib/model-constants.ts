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
        id: "wanqing-flowpilot",
        label: "FlowPilot · 晚晴",
        description: "默认模型，稳定支持 FlowPilot 的图表重排与策略输出。",
        provider: "wanqing",
        default: true,
        recommended: true,
    },
    {
        id: "wanqing-flowpilot-v2",
        label: "FlowPilot v2 · 晚晴",
        description: "增强版模型，更好的布局优化和复杂图表支持。",
        provider: "wanqing",
        recommended: true,
    },
    {
        id: "wanqing-flowpilot-fast",
        label: "FlowPilot Fast · 晚晴",
        description: "快速生成模式，适合简单流程图和快速原型。",
        provider: "wanqing",
    },
];

export const DEFAULT_MODEL_ID =
    MODEL_PRESETS.find((preset) => preset.default)?.id ?? MODEL_PRESETS[0].id;
