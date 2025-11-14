// Comparison related shared types
import type { RuntimeModelConfig } from "@/types/model-config";

export type ComparisonResultStatus = "loading" | "ok" | "error";

export interface ComparisonModelConfig {
    primary: string;
    secondary: string;
}

export interface ComparisonModelMeta {
    key: string;
    id: string;
    label: string;
    provider: string;
    slot: "A" | "B";
    runtime: RuntimeModelConfig;
}

export interface ComparisonCardResult {
    id: string;
    modelId: string;
    label: string;
    provider: string;
    slot: "A" | "B";
    status: ComparisonResultStatus;
    runtime?: RuntimeModelConfig;
    summary?: string;
    xml?: string;
    encodedXml?: string;
    previewSvg?: string;
    previewImage?: string;
    error?: string;
    branchId?: string;
}

export interface ComparisonHistoryEntry {
    requestId: string;
    prompt: string;
    timestamp: string;
    badges: string[];
    models: ComparisonModelMeta[];
    status: "loading" | "ready";
    results: ComparisonCardResult[];
    anchorMessageId?: string | null;
    adoptedResultId?: string | null;
}
