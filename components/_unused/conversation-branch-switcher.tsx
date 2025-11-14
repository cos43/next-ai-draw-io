"use client";

import { useMemo, useState } from "react";
import { GitBranch, RotateCcw } from "lucide-react";
import {
    useConversationManager,
    type ConversationBranch,
} from "@/contexts/conversation-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function describeBranch(branch: ConversationBranch): string {
    if (branch.meta?.type === "root") {
        return "对话起点";
    }
    if (branch.meta?.type === "comparison") {
        return branch.meta?.label
            ? `对比 · ${branch.meta.label}`
            : "对比生成";
    }
    if (branch.meta?.type === "manual") {
        return "手动派生";
    }
    if (branch.meta?.type === "history") {
        return "历史版本";
    }
    return "隐藏分支";
}

export function ConversationBranchSwitcher() {
    const { branchList, branchTrail, activeBranchId, switchBranch } =
        useConversationManager();
    const [isExpanded, setIsExpanded] = useState(false);

    const trailSet = useMemo(
        () => new Set(branchTrail.map((branch) => branch.id)),
        [branchTrail]
    );

    const handleRevert = (branchId: string) => {
        if (branchId === activeBranchId) {
            return;
        }
        switchBranch(branchId);
        setIsExpanded(false);
    };

    return (
        <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/5 text-slate-600">
                        <GitBranch className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            对话版本
                        </p>
                        <p className="text-[11px] text-slate-400">
                            {branchList.length} 个自动分支 • 可随时回滚
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        {branchTrail.length} STEP
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3 text-xs font-semibold"
                        onClick={() => setIsExpanded((prev) => !prev)}
                    >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        回滚
                    </Button>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-dashed border-slate-200/80 bg-white/90 p-2">
                    {branchList.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-slate-400">
                            暂无可回滚的版本。
                        </p>
                    ) : (
                        branchList.map((branch) => {
                            const isCurrent = branch.id === activeBranchId;
                            const isOnTrail = trailSet.has(branch.id);
                            const createdLabel = new Date(
                                branch.createdAt
                            ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            });
                            return (
                                <div
                                    key={branch.id}
                                    className={cn(
                                        "mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-left last:mb-0 transition",
                                        isCurrent
                                            ? "bg-slate-900 text-white"
                                            : isOnTrail
                                              ? "bg-slate-100/70 text-slate-700"
                                              : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold">
                                            {branch.label}
                                        </span>
                                        <span
                                            className={cn(
                                                "text-[11px]",
                                                isCurrent
                                                    ? "text-white/70"
                                                    : "text-slate-400"
                                            )}
                                        >
                                            {describeBranch(branch)} ·{" "}
                                            {createdLabel}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={isCurrent ? "secondary" : "outline"}
                                        className={cn(
                                            "rounded-full px-3 text-xs font-semibold",
                                            isCurrent
                                                ? "bg-white/90 text-slate-900 hover:bg-white"
                                                : ""
                                        )}
                                        disabled={isCurrent}
                                        onClick={() => handleRevert(branch.id)}
                                    >
                                        {isCurrent ? "当前" : "回滚"}
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
