import { useCallback, useEffect, useRef, useState } from "react";

import { EMPTY_MXFILE } from "@/lib/diagram-templates";
import { requestDiagramRepair } from "@/lib/diagram-repair-client";
import { replaceNodes, replaceXMLParts } from "@/lib/utils";
import {
    validateDiagramXml,
    type DiagramValidationError,
} from "@/lib/diagram-validation";
import type { RuntimeErrorPayload } from "@/types/diagram";
import type {
    AutoRepairParams,
    AutoRepairState,
    DiagramUpdateMeta,
    PendingDiagramPayload,
} from "../types";

interface UseDiagramOrchestratorParams {
    chartXML?: string | null;
    onDisplayChart: (xml: string) => void;
    updateActiveBranchDiagram: (xml: string | null) => void;
    fetchDiagramXml: () => Promise<string>;
    runtimeError: RuntimeErrorPayload | null;
    setRuntimeError: (error: RuntimeErrorPayload | null) => void;
}

export function useDiagramOrchestrator({
    chartXML,
    onDisplayChart,
    updateActiveBranchDiagram,
    fetchDiagramXml,
    runtimeError,
    setRuntimeError,
}: UseDiagramOrchestratorParams) {
    const [autoRepairState, setAutoRepairState] = useState<AutoRepairState>({
        status: "idle",
    });
    const latestDiagramXmlRef = useRef<string>(chartXML || EMPTY_MXFILE);
    const pendingDiagramRef = useRef<PendingDiagramPayload | null>(null);

    useEffect(() => {
        if (chartXML && chartXML.length > 0) {
            latestDiagramXmlRef.current = chartXML;
        }
    }, [chartXML]);

    const summarizeValidationErrors = useCallback(
        (errors: DiagramValidationError[]) =>
            errors.map((error) => `(${error.code}) ${error.message}`).join("\n"),
        []
    );

    const applyRootToCanvas = useCallback(
        (rootXml: string) => {
            const baseXml = latestDiagramXmlRef.current || chartXML || EMPTY_MXFILE;
            const merged = replaceNodes(baseXml, rootXml);
            latestDiagramXmlRef.current = merged;
            onDisplayChart(merged);
            updateActiveBranchDiagram(merged);
            return merged;
        },
        [chartXML, onDisplayChart, updateActiveBranchDiagram]
    );

    const tryApplyRoot = useCallback(
        async (xml: string) => {
            const validation = validateDiagramXml(xml);
            if (!validation.isValid) {
                throw new Error(
                    summarizeValidationErrors(validation.errors) ||
                        "生成的 XML 无法通过解析。"
                );
            }
            applyRootToCanvas(validation.normalizedXml);
        },
        [applyRootToCanvas, summarizeValidationErrors]
    );

    const runAutoRepair = useCallback(
        async ({ invalidXml, errorContext, modelRuntime }: AutoRepairParams) => {
            setAutoRepairState({
                status: "repairing",
                message:
                    "捕捉到 XML 异常，FlowPilot 正在执行「生成 → 校验 → 自动修复 → 渲染」自愈流程…",
                notes: [
                    "正在比对最近一次成功的画布，定位缺失或格式错误的节点属性。",
                    "流程：生成 → 校验 → 自动修复 → 渲染；完成后会自动刷新画布。",
                ],
            });
            try {
                const baseline =
                    (await fetchDiagramXml().catch(
                        () => latestDiagramXmlRef.current
                    )) ||
                    latestDiagramXmlRef.current ||
                    chartXML ||
                    EMPTY_MXFILE;

                const repairResult = await requestDiagramRepair({
                    invalidXml,
                    currentXml: baseline,
                    errorContext,
                    modelRuntime,
                });

                if (repairResult.strategy === "display" && repairResult.xml) {
                    pendingDiagramRef.current = {
                        xml: repairResult.xml,
                        modelRuntime,
                        source: "repair",
                    };
                    await tryApplyRoot(repairResult.xml);
                } else if (
                    repairResult.strategy === "edit" &&
                    repairResult.edits?.length
                ) {
                    const patched = replaceXMLParts(baseline, repairResult.edits);
                    latestDiagramXmlRef.current = patched;
                    onDisplayChart(patched);
                }

                setAutoRepairState({
                    status: "idle",
                    notes: repairResult.notes,
                    message:
                        repairResult.strategy === "edit"
                            ? "已通过 edit 自动修复"
                            : "已替换为稳定版本",
                });
                setRuntimeError(null);
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "自动修复失败，请重新生成。";
                setAutoRepairState({
                    status: "failed",
                    message: `FlowPilot 自愈流程仍未通过：${message}`,
                    notes: [
                        "流程回顾：生成 → 校验 → 自动修复 → 渲染。",
                        "建议修改提示词或减少一次生成的节点数量后重试。",
                        "若问题持续，可点击“清空对话”重置画布，再重新上传参考素材或截图。",
                    ],
                });
                console.error("Auto repair failed:", error);
            }
        },
        [chartXML, fetchDiagramXml, onDisplayChart, setRuntimeError, tryApplyRoot]
    );

    const handleDiagramXml = useCallback(
        async (xml: string, meta: DiagramUpdateMeta) => {
            pendingDiagramRef.current = {
                xml,
                modelRuntime: meta.modelRuntime,
                source: meta.origin,
            };
            try {
                await tryApplyRoot(xml);
                setAutoRepairState((prev) =>
                    prev.status === "failed" ? prev : { status: "idle" }
                );
            } catch (error) {
                if (meta.allowRepairFallback ?? true) {
                    await runAutoRepair({
                        invalidXml: xml,
                        errorContext:
                            error instanceof Error
                                ? error.message
                                : String(error),
                        modelRuntime: meta.modelRuntime,
                    });
                } else {
                    throw error;
                }
            }
        },
        [runAutoRepair, tryApplyRoot]
    );

    useEffect(() => {
        if (!runtimeError) {
            return;
        }
        if (pendingDiagramRef.current) {
            runAutoRepair({
                invalidXml: pendingDiagramRef.current.xml,
                errorContext: runtimeError.message,
                modelRuntime: pendingDiagramRef.current.modelRuntime,
            }).finally(() => setRuntimeError(null));
            return;
        }
        setAutoRepairState({
            status: "failed",
            message: `Draw.io 返回错误：${runtimeError.message ?? "未知异常"}`,
            notes: [
                "FlowPilot 的预期流程为：生成 → 校验 → 自动修复 → 渲染。",
                "请重新发送提示词或调整描述后重试；若仍失败，可点击输入框下方的“清空对话”刷新画布。",
            ],
        });
        setRuntimeError(null);
    }, [runtimeError, runAutoRepair, setRuntimeError]);

    const registerPendingDiagram = useCallback((payload: PendingDiagramPayload) => {
        pendingDiagramRef.current = payload;
    }, []);

    const updateLatestDiagramXml = useCallback((xml: string) => {
        latestDiagramXmlRef.current = xml;
    }, []);

    const getLatestDiagramXml = useCallback(() => {
        return latestDiagramXmlRef.current || chartXML || EMPTY_MXFILE;
    }, [chartXML]);

    return {
        autoRepairState,
        handleDiagramXml,
        tryApplyRoot,
        registerPendingDiagram,
        updateLatestDiagramXml,
        getLatestDiagramXml,
    };
}
