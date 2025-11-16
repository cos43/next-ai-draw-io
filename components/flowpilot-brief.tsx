"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Figma,
    Focus,
    LayoutDashboard,
    Settings2,
    ShieldCheck,
    Sparkles,
    Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export type BriefIntentId = "draft" | "polish" | "explain";
export type BriefToneId = "balanced" | "playful" | "enterprise" | "sketch";
export type BriefFocusId = "swimlane" | "dataflow" | "story";
export type BriefGuardrailId = "singleViewport" | "respectLabels" | "contrast";
export type BriefDiagramTypeId =
    | "sequence"
    | "activity"
    | "component"
    | "state"
    | "deployment"
    | "mindmap"
    | "journey"
    | "gantt";

export type FlowPilotBriefState = {
    intent: BriefIntentId;
    tone: BriefToneId;
    focus: BriefFocusId[];
    diagramTypes: BriefDiagramTypeId[];
    guardrails: BriefGuardrailId[];
};

type Option<T extends string> = {
    id: T;
    title: string;
    description: string;
    prompt: string;
};

type GuardrailOption<T extends string> = Option<T> & {
    badge: string;
};

export const INTENT_OPTIONS: Option<BriefIntentId>[] = [
    {
        id: "draft",
        title: "空白起稿",
        description: "从描述构建全新画布",
        prompt: "从零开始构建完整图表，合理分区并命名节点。",
    },
    {
        id: "polish",
        title: "结构整理",
        description: "保持内容，重排布局",
        prompt: "保持现有信息不变，专注对齐、分组与节奏感。",
    },
    {
        id: "explain",
        title: "讲解拆解",
        description: "提炼逻辑并提出建议",
        prompt: "优先总结当前画布逻辑，输出洞察与改进建议。",
    },
];

export const TONE_OPTIONS: Option<BriefToneId>[] = [
    {
        id: "balanced",
        title: "产品规范",
        description: "中性灰 + 微配色",
        prompt: "采用中性灰与轻配色，保持企业级产品质感。",
    },
    {
        id: "playful",
        title: "创意手稿",
        description: "更自由的排线",
        prompt: "允许更大胆的色块与手写式注释，强调灵感感。",
    },
    {
        id: "enterprise",
        title: "汇报精简",
        description: "干净、适合幻灯片",
        prompt: "控制元素数量，偏右上角留白，适合直接投影展示。",
    },
    {
        id: "sketch",
        title: "草稿手绘",
        description: "draw.io 草稿风格",
        prompt: "切换到 draw.io 草稿主题，使用粗描边、淡手绘色块与手写字体风格，强调草稿临摹感。",
    },
];

export const FOCUS_OPTIONS: Option<BriefFocusId>[] = [
    {
        id: "swimlane",
        title: "泳道清晰",
        description: "流程跨角色可视",
        prompt: "强化泳道边界，凸显跨角色交互。",
    },
    {
        id: "dataflow",
        title: "数据流动",
        description: "强调输入输出",
        prompt: "标记每一步的输入输出，并保持箭头一致方向。",
    },
    {
        id: "story",
        title: "叙事节奏",
        description: "突出开始与高潮",
        prompt: "增加阶段标题与关键节点标记，让流程更故事化。",
    },
];

export const DIAGRAM_TYPE_OPTIONS: Option<BriefDiagramTypeId>[] = [
    {
        id: "sequence",
        title: "系统时序",
        description: "PlantUML 时序/交互",
        prompt: "将主要服务/角色转化为时序生命线，突出请求-响应链路与异步回调。",
    },
    {
        id: "activity",
        title: "业务活动",
        description: "流程/分支逻辑",
        prompt: "以 Activity Diagram 表达条件分支与并行汇合，标注每个动作的入口出口条件。",
    },
    {
        id: "component",
        title: "组件依赖",
        description: "子系统与接口",
        prompt: "使用组件图视角，强调子系统、接口契约与部署边界，标出关键依赖方向。",
    },
    {
        id: "state",
        title: "状态机",
        description: "对象生命周期",
        prompt: "绘制状态机，展示核心对象的状态迁移、守卫条件，以及循环或终止状态。",
    },
    {
        id: "deployment",
        title: "部署拓扑",
        description: "节点/网络",
        prompt: "输出部署图，列出环境节点、容器/服务实例及网络关系，标记安全域与端口。",
    },
    {
        id: "mindmap",
        title: "思维导图",
        description: "发散结构",
        prompt: "用思维导图方式整理主题、分支与子要点，保持手绘草稿质感。",
    },
    {
        id: "journey",
        title: "体验旅程",
        description: "阶段/感受",
        prompt: "以客户旅程视角展示阶段、触点、情绪曲线与责任团队。",
    },
    {
        id: "gantt",
        title: "甘特排程",
        description: "计划/依赖",
        prompt: "绘制简化甘特图，包含里程碑、持续时长与依赖关系，适合快速排程讨论。",
    },
];

export const GUARDRAIL_OPTIONS: GuardrailOption<BriefGuardrailId>[] = [
    {
        id: "singleViewport",
        title: "单屏锁定",
        description: "所有节点保持在 800×600 内",
        prompt: "确保所有元素保持在 800×600 视口内，不产生分页。",
        badge: "画布",
    },
    {
        id: "respectLabels",
        title: "保持命名",
        description: "不改动现有标签含义",
        prompt: "保留现有节点命名与连线含义，若需新增请附注释。",
        badge: "内容",
    },
    {
        id: "contrast",
        title: "高对比标注",
        description: "关键步骤突出显示",
        prompt: "为关键步骤添加强调色或标签，便于大屏展示。",
        badge: "强调",
    },
];

interface FlowPilotBriefProps {
    state: FlowPilotBriefState;
    onChange: (state: Partial<FlowPilotBriefState>) => void;
    disabled?: boolean;
}

export function FlowPilotBrief({
    state,
    onChange,
    disabled = false,
}: FlowPilotBriefProps) {
    const handleFocusToggle = (focusId: BriefFocusId) => {
        const exists = state.focus.includes(focusId);
        const next = exists
            ? state.focus.filter((id) => id !== focusId)
            : [...state.focus, focusId];
        onChange({ focus: next });
    };

    const handleGuardrailToggle = (guardrailId: BriefGuardrailId) => {
        const exists = state.guardrails.includes(guardrailId);
        const next = exists
            ? state.guardrails.filter((id) => id !== guardrailId)
            : [...state.guardrails, guardrailId];
        onChange({ guardrails: next });
    };

    const handleDiagramTypeToggle = (diagramTypeId: BriefDiagramTypeId) => {
        const exists = state.diagramTypes.includes(diagramTypeId);
        const next = exists
            ? state.diagramTypes.filter((id) => id !== diagramTypeId)
            : [...state.diagramTypes, diagramTypeId];
        onChange({ diagramTypes: next });
    };

    return (
        <div className="rounded-2xl border bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    FlowPilot Brief
                </div>
                <p className="text-sm text-slate-600">
                    先设定目标、调性与关注点，AI 会带着这些偏好执行每一次修改。
                </p>
            </div>

            <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <LayoutDashboard className="h-4 w-4" />
                    任务模式
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                    {INTENT_OPTIONS.map((option) => {
                        const isActive = state.intent === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={disabled}
                                className={cn(
                                    "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                    isActive
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                                )}
                                onClick={() => onChange({ intent: option.id })}
                            >
                                <p className="text-sm font-semibold">
                                    {option.title}
                                </p>
                                <p
                                    className={cn(
                                        "text-xs mt-0.5",
                                        isActive ? "text-slate-200" : "text-slate-500"
                                    )}
                                >
                                    {option.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Figma className="h-4 w-4" />
                    视觉调性
                </div>
                <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map((option) => {
                        const isActive = state.tone === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={disabled}
                                className={cn(
                                    "rounded-full border px-4 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                    isActive
                                        ? "border-slate-900 bg-slate-900 text-white shadow"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                )}
                                onClick={() => onChange({ tone: option.id })}
                            >
                                {option.title}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Focus className="h-4 w-4" />
                    关注重点
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                    {FOCUS_OPTIONS.map((option) => {
                        const isActive = state.focus.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={disabled}
                                className={cn(
                                    "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                    isActive
                                        ? "border-emerald-500 bg-emerald-50"
                                        : "border-slate-200 bg-white hover:border-slate-400"
                                )}
                                onClick={() => handleFocusToggle(option.id)}
                            >
                                <p className="text-sm font-semibold text-slate-900">
                                    {option.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {option.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Workflow className="h-4 w-4" />
                    图表类型
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    {DIAGRAM_TYPE_OPTIONS.map((option) => {
                        const isActive = state.diagramTypes.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={disabled}
                                className={cn(
                                    "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                    isActive
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-slate-200 bg-white hover:border-slate-400"
                                )}
                                onClick={() => handleDiagramTypeToggle(option.id)}
                            >
                                <p className="text-sm font-semibold text-slate-900">
                                    {option.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {option.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <ShieldCheck className="h-4 w-4" />
                    设计护栏
                </div>
                <div className="flex flex-wrap gap-2">
                    {GUARDRAIL_OPTIONS.map((option) => {
                        const isActive = state.guardrails.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={disabled}
                                className={cn(
                                    "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                    isActive
                                        ? "border-amber-500 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                                )}
                                onClick={() => handleGuardrailToggle(option.id)}
                            >
                                <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold">
                                    {option.badge}
                                </span>
                                {option.title}
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

interface FlowPilotBriefDialogProps extends FlowPilotBriefProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FlowPilotBriefDialog({
    state,
    onChange,
    disabled = false,
    open,
    onOpenChange,
}: FlowPilotBriefDialogProps) {
    const handleOpenChange = (nextOpen: boolean) => {
        if (disabled && nextOpen) {
            return;
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>FlowPilot Brief 偏好配置</DialogTitle>
                    <DialogDescription>
                        配置图表创作意图、调性与护栏，所有后续请求都会带着这些偏好执行。
                    </DialogDescription>
                </DialogHeader>
                <FlowPilotBrief state={state} onChange={onChange} disabled={disabled} />
                <DialogFooter>
                    <Button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={disabled}
                    >
                        完成
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface FlowPilotBriefLauncherProps extends FlowPilotBriefProps {
    badges: string[];
}

export function FlowPilotBriefLauncher({
    state,
    onChange,
    disabled,
    badges,
}: FlowPilotBriefLauncherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const summary =
        badges.length > 0
            ? badges.slice(0, 3).join(" · ")
            : "默认：空白起稿 · 产品规范 · 单屏锁定";

    const renderSummaryBadges = () => {
        if (badges.length === 0) return null;
        const clipped = badges.slice(0, 5);
        const remaining = Math.max(0, badges.length - 5);
        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {clipped.map((badge, index) => (
                    <span
                        key={`${badge}-${index}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                    >
                        {badge}
                    </span>
                ))}
                {remaining > 0 && (
                    <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500">
                        +{remaining} 更多
                    </span>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            FlowBrief 偏好
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => setIsOpen(true)}
                        className="inline-flex items-center gap-1"
                    >
                        <Settings2 className="h-4 w-4" />
                        调整偏好
                    </Button>
                </div>
                {renderSummaryBadges()}
            </div>
            <FlowPilotBriefDialog
                state={state}
                onChange={onChange}
                disabled={disabled}
                open={isOpen}
                onOpenChange={setIsOpen}
            />
        </>
    );
}
