"use client";

import { useMemo, useState } from "react";
import { Loader2, Settings2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiagram } from "@/contexts/diagram-context";
import {
    calibrateDiagram,
    CalibrationReport,
} from "@/lib/calibration";

interface CalibrationConsoleProps {
    disabled?: boolean;
    onFetchChart: () => Promise<string>;
    onAiCalibrate: () => Promise<void>;
}

export function CalibrationConsole({
    disabled = false,
    onFetchChart,
    onAiCalibrate,
}: CalibrationConsoleProps) {
    const { loadDiagram, handleExport } = useDiagram();
    const [report, setReport] = useState<CalibrationReport | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isAiRunning, setIsAiRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

    const stats = useMemo(() => {
        if (!report) {
            return [
                { label: "节点对齐", value: "—", detail: "待校准" },
                { label: "箭头整理", value: "—", detail: "待校准" },
                { label: "间距均衡", value: "—", detail: "待校准" },
            ];
        }

        return [
            {
                label: "节点对齐",
                value:
                    report.nodesProcessed > 0
                        ? `${report.nodesAdjusted}/${report.nodesProcessed}`
                        : "0",
                detail: "移动节点 / 全部节点",
            },
            {
                label: "箭头整理",
                value: report.connectorsProcessed
                    ? `${report.connectorsRestyled + report.connectorWaypointsCleared}/${report.connectorsProcessed}`
                    : "0",
                detail: "清理与重绘的箭头",
            },
            {
                label: "间距均衡",
                value: `${report.averageHorizontalGap}px / ${report.averageRowGap}px`,
                detail: "列距 / 行距（平均值）",
            },
        ];
    }, [report]);

    const helperText =
        "先用 AI 进行大范围重排，再用本地网格整理微调节点与箭头。";

    const localSummary = report
        ? `最近一次网格整理：${report.nodesAdjusted}/${report.nodesProcessed} 个节点被重排，平均列距 ${report.averageHorizontalGap}px，平均行距 ${report.averageRowGap}px。`
        : "尚未执行过本地网格整理。";

    const runAiCalibration = async () => {
        if (isAiRunning || disabled) return;
        setError(null);
        setStatusMessage(null);
        setIsAiRunning(true);
        try {
            await onAiCalibrate();
            setStatusMessage("已向大模型发出校准指令，稍后在对话区查看新布局。");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "AI 校准失败，请稍后再试。"
            );
        } finally {
            setIsAiRunning(false);
        }
    };

    const runLocalCalibration = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setError(null);
        setStatusMessage(null);
        try {
            const currentXml = await onFetchChart();
            const { xml: optimizedXml, report } = calibrateDiagram(currentXml);
            loadDiagram(optimizedXml);
            setReport(report);
            setLastRunAt(new Date());
            setStatusMessage(
                `完成本地网格整理，用时 ${report.durationMs}ms，节点已对齐到 ${report.gridSize}px 网格。`
            );

            // 触发一次导出，用于刷新历史记录
            window.setTimeout(() => {
                try {
                    handleExport();
                } catch (err) {
                    console.warn("Auto export after calibration failed", err);
                }
            }, 300);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "校准失败，请稍后重试。"
            );
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        FlowPilot 校准舱
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        {helperText}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {localSummary}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        onClick={runAiCalibration}
                        disabled={disabled || isAiRunning}
                        className="inline-flex items-center gap-2"
                    >
                        {isAiRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Wand2 className="h-4 w-4" />
                        )}
                        {isAiRunning ? "推送中…" : "AI 校准"}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={runLocalCalibration}
                        disabled={disabled || isRunning}
                        className="inline-flex items-center gap-2"
                    >
                        {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Settings2 className="h-4 w-4" />
                        )}
                        {isRunning ? "整理中…" : "网格微调"}
                    </Button>
                </div>
            </div>

            {statusMessage ? (
                <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700">
                    {statusMessage}
                </div>
            ) : null}

            <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wide">
                        本地网格整理
                    </span>
                    {report ? (
                        <span className="text-[11px] text-slate-400">
                            网格 {report.gridSize}px · 用时 {report.durationMs}ms
                            {lastRunAt
                                ? ` · 上次 ${lastRunAt.toLocaleTimeString(
                                      "zh-CN",
                                      {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      }
                                  )}`
                                : ""}
                        </span>
                    ) : (
                        <span className="text-[11px] text-slate-400">
                            尚未运行
                        </span>
                    )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <div className="text-xs text-slate-500">
                                {stat.label}
                            </div>
                            <div className="text-lg font-semibold text-slate-900">
                                {stat.value}
                            </div>
                            <p className="text-xs text-slate-400">
                                {stat.detail}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {report?.warnings.length ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    {report.warnings.join(" / ")}
                </div>
            ) : null}

            {error ? (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                    {error}
                </div>
            ) : null}
        </div>
    );
}
