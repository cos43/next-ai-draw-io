// Comparison related shared types

export type ComparisonResultStatus = "loading" | "ok" | "error";

export interface ComparisonModelConfig {
    primary: string;
    secondary: string;
}

export interface ComparisonModelMeta {
    id: string;
    label: string;
    provider: string;
    slot: "A" | "B";
}

export interface ComparisonCardResult {
    id: string;
    modelId: string;
    label: string;
    provider: string;
    slot: "A" | "B";
    status: ComparisonResultStatus;
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
}
