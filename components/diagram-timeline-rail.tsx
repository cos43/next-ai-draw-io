"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    ChevronDown,
    ChevronUp,
    Clock3,
    History,
    Sparkles,
} from "lucide-react";

interface DiagramTimelineRailProps {
    history: { svg: string; xml: string }[];
    activeIndex: number;
    onSelect: (index: number) => void;
    onShowHistory: () => void;
    disabled?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function DiagramTimelineRail({
    history,
    activeIndex,
    onSelect,
    onShowHistory,
    disabled = false,
    collapsed = false,
    onToggleCollapse,
}: DiagramTimelineRailProps) {
    const hasHistory = history.length > 0;
    const latestEntry =
        history[activeIndex] ?? history[history.length - 1] ?? null;
    const containerClass = cn(
        "rounded-lg border border-slate-200/60 bg-slate-50/50 shadow-none",
        collapsed ? "p-2" : "p-3"
    );

    return (
        <div className={containerClass}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <Clock3 className="h-3 w-3 text-slate-300" />
                        画布脉络
                    </div>
                    {!collapsed && (
                        <p className="text-xs text-slate-500 mt-1">
                            实时记录每次导出的图表，你可以秒切任意版本。
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onShowHistory}
                        disabled={!hasHistory}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
                            hasHistory
                                ? "border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400"
                                : "border-slate-200 text-slate-300 cursor-not-allowed"
                        )}
                    >
                        <History className="h-3 w-3" />
                        全部版本
                    </button>
                    {onToggleCollapse && (
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white"
                        >
                            {collapsed ? (
                                <>
                                    <ChevronDown className="h-3 w-3" />
                                    展开
                                </>
                            ) : (
                                <>
                                    <ChevronUp className="h-3 w-3" />
                                    收起
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
            {collapsed ? (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    {hasHistory && latestEntry ? (
                        <>
                            <span>
                                当前 V{Math.max(1, activeIndex + 1)} · 共{" "}
                                {history.length} 版
                            </span>
                            <span className="text-[10px] text-slate-400">
                                展开可查看缩略图与恢复历史
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-400">暂无历史，发送指令后会自动记录版本。</span>
                    )}
                </div>
            ) : !hasHistory ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-400">
                    发送第一条指令后，FlowPilot 会在这里生成时间脉络，方便回溯。
                </div>
            ) : (
                <>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {history.map((entry, index) => {
                            const isActive = index === activeIndex;
                            return (
                                <button
                                    key={`timeline-${index}`}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onSelect(index)}
                                    className={cn(
                                        "flex min-w-[100px] flex-col gap-1 rounded-lg border bg-white/90 p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 disabled:opacity-60",
                                        isActive
                                            ? "border-slate-400 shadow-sm"
                                            : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex h-20 items-center justify-center overflow-hidden rounded border bg-slate-50">
                                        <Image
                                            src={entry.svg}
                                            alt={`图表版本 ${index + 1}`}
                                            width={140}
                                            height={80}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-600">
                                        <span>V{index + 1}</span>
                                        {isActive && (
                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white">
                                                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                                                当前
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400">
                        小提示：正在流式生成时仍可切换旧版本，AI 完成后会回到最新状态。
                    </p>
                </>
            )}
        </div>
    );
}
