import type { LucideIcon } from "lucide-react";
import type { RuntimeModelConfig } from "@/types/model-config";

export type ToolPanel = "brief" | "calibration" | "actions";

export interface ToolbarActionDefinition {
    label: string;
    description: string;
    icon: LucideIcon;
}

export type AutoRepairStatus = "idle" | "repairing" | "failed";

export interface AutoRepairState {
    status: AutoRepairStatus;
    message?: string;
    notes?: string | string[];
}

export interface DiagramUpdateMeta {
    origin: "display" | "repair" | "edit";
    modelRuntime?: RuntimeModelConfig;
    allowRepairFallback?: boolean;
}

export interface PendingDiagramPayload {
    xml: string;
    modelRuntime?: RuntimeModelConfig;
    source: "display" | "repair" | "edit";
}

export interface AutoRepairParams {
    invalidXml: string;
    errorContext?: string;
    modelRuntime?: RuntimeModelConfig;
}

export type ComparisonNotice = {
    type: "success" | "error";
    message: string;
};
