import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AutoRepairState } from "../types";

interface AutoRepairBannerProps {
    state: AutoRepairState;
}

export function AutoRepairBanner({ state }: AutoRepairBannerProps) {
    if (state.status === "idle") {
        return null;
    }

    const isRepairing = state.status === "repairing";

    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                isRepairing
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-red-200 bg-red-50 text-red-600"
            )}
        >
            {isRepairing ? (
                <>
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                    <span>
                        {state.message ||
                            "捕捉到 draw.io 错误，正在自动修复..."}
                    </span>
                </>
            ) : (
                <>
                    <X className="h-3 w-3" />
                    <span>{state.message || "自动修复失败，请重新生成或调整指令。"}</span>
                </>
            )}
            {state.notes && (
                <div className="ml-4 flex flex-col gap-1 text-[11px] leading-snug text-slate-700">
                    {(Array.isArray(state.notes) ? state.notes : [state.notes]).map(
                        (note, index) => (
                            <div key={index} className="flex items-start gap-1">
                                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
                                <span className="flex-1">{note}</span>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
