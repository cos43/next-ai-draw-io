"use client";

import { CheckCircle2, PenTool, PlayCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePptStudio } from "@/contexts/ppt-studio-context";

const STEP_META = {
    brief: {
        label: "输入资料",
        description: "主题、受众、目标",
        icon: Sparkles,
    },
    blueprint: {
        label: "编辑骨架",
        description: "逐页完善结构",
        icon: PenTool,
    },
    render: {
        label: "生成幻灯片",
        description: "并行绘制 + 导出",
        icon: PlayCircle,
    },
} as const;

export function PptStepper() {
    const { step, setStep, blueprint, slideJobs } = usePptStudio();

    const slidesReady = Object.values(slideJobs).filter(
        (job) => job.status === "ready"
    ).length;

    const canAccess = {
        brief: true,
        blueprint: Boolean(blueprint),
        render: Boolean(blueprint && blueprint.slides.length > 0),
    };

    return (
        <div className="sticky top-[72px] flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                FlowPilot · 幻灯片管线
            </div>
            <div className="flex flex-col gap-2">
                {(Object.keys(STEP_META) as Array<keyof typeof STEP_META>).map(
                    (key) => {
                        const meta = STEP_META[key];
                        const Icon = meta.icon;
                        const isActive = step === key;
                        const unlocked = canAccess[key];
                        const done =
                            (key === "blueprint" && step === "render") ||
                            (key === "brief" && step !== "brief");
                        return (
                            <button
                                key={key}
                                type="button"
                                className={cn(
                                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                                    isActive
                                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                                    !unlocked && "cursor-not-allowed opacity-60"
                                )}
                                onClick={() => unlocked && setStep(key)}
                                disabled={!unlocked}
                            >
                                <div className="flex items-center justify-between text-sm font-semibold">
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            className={cn(
                                                "h-4 w-4",
                                                isActive ? "text-white" : "text-slate-400"
                                            )}
                                        />
                                        {meta.label}
                                    </div>
                                    {done && (
                                        <CheckCircle2
                                            className={cn(
                                                "h-4 w-4",
                                                isActive ? "text-emerald-200" : "text-emerald-500"
                                            )}
                                        />
                                    )}
                                </div>
                                <p
                                    className={cn(
                                        "mt-1 text-xs",
                                        isActive ? "text-slate-200" : "text-slate-500"
                                    )}
                                >
                                    {meta.description}
                                </p>
                                {key === "render" && slidesReady > 0 && (
                                    <p
                                        className={cn(
                                            "mt-1 text-[11px]",
                                            isActive ? "text-emerald-200" : "text-emerald-600"
                                        )}
                                    >
                                        已完成 {slidesReady} 页
                                    </p>
                                )}
                            </button>
                        );
                    }
                )}
            </div>
        </div>
    );
}
