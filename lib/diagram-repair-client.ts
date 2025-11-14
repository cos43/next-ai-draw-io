import type { RuntimeModelConfig } from "@/types/model-config";

export type DiagramRepairStrategy = "display" | "edit";

export interface DiagramRepairRequest {
    invalidXml: string;
    currentXml?: string;
    errorContext?: string;
    modelRuntime?: RuntimeModelConfig;
}

export interface DiagramRepairResponse {
    strategy: DiagramRepairStrategy;
    xml?: string;
    edits?: Array<{ search: string; replace: string }>;
    notes?: string;
}

export async function requestDiagramRepair(
    payload: DiagramRepairRequest
): Promise<DiagramRepairResponse> {
    const response = await fetch("/api/diagram-repair", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            invalidXml: payload.invalidXml,
            currentXml: payload.currentXml,
            errorContext: payload.errorContext,
            modelRuntime: payload.modelRuntime,
        }),
    });

    if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: "repair_failed" }));
        throw new Error(
            typeof error === "string" ? error : "自动修复接口调用失败"
        );
    }

    const data = (await response.json()) as DiagramRepairResponse;
    if (data.strategy !== "display" && data.strategy !== "edit") {
        throw new Error("无法识别的自动修复策略。");
    }
    return data;
}
