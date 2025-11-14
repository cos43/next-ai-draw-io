"use client";

import type React from "react";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { FaGithub } from "react-icons/fa";
import {
    ListMinus,
    ListPlus,
    PanelRightClose,
    Settings,
    Zap,
    FileText,
    X,
    Sparkles,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage as Message } from "ai";
import { ChatInputOptimized } from "@/components/chat-input-optimized";
import { ChatMessageDisplay } from "./chat-message-display";
import { useDiagram } from "@/contexts/diagram-context";
import { useConversationManager } from "@/contexts/conversation-context";
import {
    cn,
    decodeDiagramXml,
    encodeDiagramXml,
    formatXML,
    replaceNodes,
    replaceXMLParts,
} from "@/lib/utils";
import { SessionStatus } from "@/components/session-status";
import {
    QuickActionBar,
    QuickActionDefinition,
} from "@/components/quick-action-bar";
import {
    FlowPilotBriefLauncher,
    FlowPilotBriefState,
    FOCUS_OPTIONS,
    GUARDRAIL_OPTIONS,
    INTENT_OPTIONS,
    TONE_OPTIONS,
} from "./flowpilot-brief";
import { ReportBlueprintTray } from "./report-blueprint-tray";
import { CalibrationConsole } from "./calibration-console";
import { useChatState } from "@/hooks/use-chat-state";
import { DEFAULT_MODEL_ID, MODEL_PRESETS } from "@/lib/model-constants";
import { validateDiagramXml } from "@/lib/diagram-validation";
import type { DiagramValidationError } from "@/lib/diagram-validation";
import { requestDiagramRepair } from "@/lib/diagram-repair-client";
import { EMPTY_MXFILE } from "@/lib/diagram-templates";
import {
    ModelComparisonConfigDialog,
    ComparisonModelConfig,
} from "@/components/model-comparison-config-dialog";
import {
    ComparisonCardResult,
    ComparisonHistoryEntry,
    ComparisonModelMeta,
    ComparisonResultStatus,
} from "@/types/comparison";

const FLOWPILOT_AI_CALIBRATION_PROMPT = `### FlowPilot 校准舱 · AI 重排指令
我们需要在不改变节点语义的前提下，利用当前 draw.io XML 对图表做一次「版式重排」。目标：保持单页展示 (x:0-800, y:0-600)，让主流程更突出、泳道/分区更规整，箭头间距更干净。

硬性要求：
1. 保留全部节点、标签与图标，只有在完全重叠或内容为空时才能合并，绝不新增业务含义。
2. 若原图存在泳道/分组/容器，沿用它们并保持 64px 垂直间距，内部子节点水平间距 56-80px、垂直间距 64-96px，容器 padding ≥ 24px。
3. 所有节点对齐到 24px 网格，避免出现负坐标或跨页；必要时统一节点宽度或高度以获得更好的列对齐。
4. 连接线必须使用 orthogonalEdgeStyle、rounded=1、endArrow=block、strokeColor=#1f2937，尽量减少交叉，允许添加/调整拐点。
5. 至少强调一条「主流程」路径，可通过加粗箭头或淡色背景突出，但绝不改动文字内容。
6. 提交前自检：无元素越界、无重叠、无孤立箭头或断开的连线。

执行策略：
- 如果只是部分细节调整，可用 edit_diagram 进行批量替换；若布局极度混乱，请直接用 display_diagram 返回全新的 <root>，并在 0-800 × 0-600 内排布。
- 维持既有配色/主题（如 AWS 图标、泳道色块等），只整理结构与间距。

请根据上述要求返回最终 XML，只能通过合适的工具调用输出，勿在文本中粘贴 XML。`;

type ToolPanel = "brief" | "calibration" | "actions";

const TOOLBAR_ACTIONS: Record<
    ToolPanel,
    {
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        description: string;
    }
> = {
    brief: {
        label: "配置",
        icon: Settings,
        description: "调整 FlowPilot Brief 偏好",
    },
    calibration: {
        label: "校准",
        icon: Zap,
        description: "触发画布整理与布局建议",
    },
    actions: {
        label: "模板",
        icon: FileText,
        description: "调用灵感与述职模板",
    },
};

type AutoRepairStatus = "idle" | "repairing" | "failed";

interface AutoRepairState {
    status: AutoRepairStatus;
    message?: string;
    notes?: string | string[];
}

interface DiagramUpdateMeta {
    origin: "display" | "repair";
    modelId?: string;
    allowRepairFallback?: boolean;
}

interface PendingDiagramPayload {
    xml: string;
    modelId?: string;
    source: "display" | "repair" | "edit";
}

interface AutoRepairParams {
    invalidXml: string;
    errorContext?: string;
    modelId?: string;
}

interface ChatPanelProps {
    onCollapse?: () => void;
    isCollapsible?: boolean;
}

type ComparisonNotice = {
    type: "success" | "error";
    message: string;
};

function resolvePresetLabel(modelId: string): string {
    const preset = MODEL_PRESETS.find((item) => item.id === modelId);
    return preset?.label ?? modelId;
}

function resolvePresetProvider(modelId: string): string {
    const preset = MODEL_PRESETS.find((item) => item.id === modelId);
    return preset?.provider ?? "wanqing";
}

const cloneMessages = (messages: Message[]): Message[] =>
    messages.map((message) => ({ ...message }));

const hasUsableComparisonOutput = (results: ComparisonCardResult[]) =>
    results.some((result) => result.status === "ok" && Boolean(result.xml));

export default function ChatPanelOptimized({
    onCollapse,
    isCollapsible = false,
}: ChatPanelProps) {
    const {
        loadDiagram: onDisplayChart,
        chartXML,
        clearDiagram,
        diagramHistory,
        restoreDiagramAt,
        activeVersionIndex,
        fetchDiagramXml,
        runtimeError,
        setRuntimeError,
    } = useDiagram();

    const {
        isConversationStarted,
        messageCount,
        isCompactMode,
        startConversation,
        incrementMessageCount,
        clearConversation,
        toggleCompactMode,
    } = useChatState();
    const {
        activeBranch,
        activeBranchId,
        createBranch,
        switchBranch,
        updateActiveBranchMessages,
        updateActiveBranchDiagram,
        resetActiveBranch,
    } = useConversationManager();
    const lastBranchIdRef = useRef(activeBranchId);

    const onFetchChart = useCallback(() => fetchDiagramXml(), [fetchDiagramXml]);

    // State management
    const [files, setFiles] = useState<File[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [input, setInput] = useState("");
    const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
    const [briefState, setBriefState] = useState<FlowPilotBriefState>({
        intent: "draft",
        tone: "balanced",
        focus: ["swimlane"],
        guardrails: ["singleViewport", "respectLabels"],
    });
    const [commandTab, setCommandTab] = useState<"starter" | "report">("starter");
    const [activeToolPanel, setActiveToolPanel] = useState<ToolPanel | null>(null);
    const [isToolSidebarOpen, setIsToolSidebarOpen] = useState(false);
    const [autoRepairState, setAutoRepairState] = useState<AutoRepairState>({
        status: "idle",
    });
    const latestDiagramXmlRef = useRef<string>(chartXML || EMPTY_MXFILE);
    const pendingDiagramRef = useRef<PendingDiagramPayload | null>(null);
    const comparisonNoticeTimeoutRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);
    const [comparisonNotice, setComparisonNotice] =
        useState<ComparisonNotice | null>(null);
    const [comparisonConfig, setComparisonConfig] =
        useState<ComparisonModelConfig>({
            primary: DEFAULT_MODEL_ID,
            secondary: DEFAULT_MODEL_ID,
        });
    const [isComparisonConfigOpen, setIsComparisonConfigOpen] = useState(false);
    const [isComparisonRunning, setIsComparisonRunning] = useState(false);
    const [comparisonHistory, setComparisonHistory] = useState<
        ComparisonHistoryEntry[]
    >([]);
    const comparisonPreviewBaselineRef = useRef<string | null>(null);
    const [activeComparisonPreview, setActiveComparisonPreview] = useState<{
        requestId: string;
        resultId: string;
    } | null>(null);
    const [requiresBranchDecision, setRequiresBranchDecision] = useState(false);

    useEffect(() => {
        if (chartXML && chartXML.length > 0) {
            latestDiagramXmlRef.current = chartXML;
        }
    }, [chartXML]);

    useEffect(() => {
        return () => {
            if (comparisonNoticeTimeoutRef.current) {
                clearTimeout(comparisonNoticeTimeoutRef.current);
            }
        };
    }, []);

    const summarizeValidationErrors = useCallback(
        (errors: DiagramValidationError[]) =>
            errors.map((error) => `(${error.code}) ${error.message}`).join("\n"),
        []
    );

    const applyRootToCanvas = useCallback(
        (rootXml: string) => {
            const baseXml =
                latestDiagramXmlRef.current || chartXML || EMPTY_MXFILE;
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
        async ({ invalidXml, errorContext, modelId }: AutoRepairParams) => {
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
                    modelId,
                });

                if (repairResult.strategy === "display" && repairResult.xml) {
                    pendingDiagramRef.current = {
                        xml: repairResult.xml,
                        modelId,
                        source: "repair",
                    };
                    await tryApplyRoot(repairResult.xml);
                } else if (
                    repairResult.strategy === "edit" &&
                    repairResult.edits?.length
                ) {
                    const patched = replaceXMLParts(
                        baseline,
                        repairResult.edits
                    );
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
        [
            chartXML,
            fetchDiagramXml,
            onDisplayChart,
            setRuntimeError,
            tryApplyRoot,
        ]
    );

    const triggerComparisonNotice = useCallback(
        (type: "success" | "error", message: string) => {
            if (comparisonNoticeTimeoutRef.current) {
                clearTimeout(comparisonNoticeTimeoutRef.current);
            }
            setComparisonNotice({ type, message });
            comparisonNoticeTimeoutRef.current = setTimeout(() => {
                setComparisonNotice(null);
            }, 4000);
        },
        []
    );

    const serializeAttachments = useCallback(async (fileList: File[]) => {
        const attachments: { url: string; mediaType: string }[] = [];
        for (const file of fileList) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () =>
                    reject(
                        new Error(
                            `无法读取附件「${file.name}」，请重试或更换素材。`
                        )
                    );
                reader.readAsDataURL(file);
            });
            attachments.push({
                url: dataUrl,
                mediaType: file.type,
            });
        }
        return attachments;
    }, []);

    const ensureBranchSelectionSettled = useCallback(() => {
        if (!requiresBranchDecision) {
            return true;
        }
        triggerComparisonNotice(
            "error",
            "请先在上次对比结果中选择一个分支，再继续操作。"
        );
        return false;
    }, [requiresBranchDecision, triggerComparisonNotice]);

    const handleCopyXml = useCallback(
        async (xml: string) => {
            if (!xml || xml.trim().length === 0) {
                triggerComparisonNotice(
                    "error",
                    "当前结果缺少 XML 内容，无法复制。"
                );
                return;
            }
            try {
                await navigator.clipboard.writeText(xml);
                triggerComparisonNotice("success", "XML 已复制到剪贴板。");
            } catch (error) {
                console.error("Copy XML failed:", error);
                triggerComparisonNotice(
                    "error",
                    "复制 XML 失败，请检查浏览器权限。"
                );
            }
        },
        [triggerComparisonNotice]
    );

    const createComparisonEntry = useCallback(
        ({
            prompt,
            badges,
            models,
        }: {
            prompt: string;
            badges: string[];
            models: ComparisonModelMeta[];
        }) => {
            const requestId = `cmp-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`;
            const timestamp = new Date().toISOString();
            const entry: ComparisonHistoryEntry = {
                requestId,
                prompt,
                timestamp,
                badges,
                models,
                status: "loading",
                results: models.map((model) => ({
                    id: `${model.id}__${model.slot}`,
                    modelId: model.id,
                    label: model.label,
                    provider: model.provider,
                    slot: model.slot,
                    status: "loading",
                })),
            };
            setComparisonHistory((prev) => [...prev, entry]);
            return requestId;
        },
        []
    );

    const attachBranchToResult = useCallback(
        (resultId: string, branchId: string) => {
            if (!resultId || !branchId) {
                return;
            }
            setComparisonHistory((prev) =>
                prev.map((entry) => ({
                    ...entry,
                    results: entry.results.map((result) =>
                        result.id === resultId
                            ? { ...result, branchId }
                            : result
                    ),
                }))
            );
        },
        [setComparisonHistory]
    );

    const createComparisonBranchesForResults = useCallback(
        (
            requestId: string,
            results: ComparisonCardResult[],
            originBranchId: string,
            seedMessages: Message[]
        ) => {
            const bindings: Record<string, string> = {};
            results.forEach((result) => {
                const label =
                    result.label?.trim()?.length
                        ? `${result.label} · 分支`
                        : `模型 ${result.slot} · 分支`;
                const branch = createBranch({
                    parentId: originBranchId,
                    label,
                    diagramXml: result.xml ?? null,
                    meta: {
                        type: "comparison",
                        comparisonRequestId: requestId,
                        comparisonResultId: result.id,
                        label: result.label,
                    },
                    activate: false,
                    inheritMessages: false,
                    seedMessages,
                });
                if (branch) {
                    bindings[result.id] = branch.id;
                }
            });
            return bindings;
        },
        [createBranch]
    );

    const updateComparisonEntry = useCallback(
        (
            requestId: string,
            updater: (entry: ComparisonHistoryEntry) => ComparisonHistoryEntry
        ) => {
            setComparisonHistory((prev) =>
                prev.map((entry) =>
                    entry.requestId === requestId ? updater(entry) : entry
                )
            );
        },
        []
    );

    const clearComparisonPreview = useCallback(
        async (showNotice?: boolean) => {
            if (!comparisonPreviewBaselineRef.current) {
                setActiveComparisonPreview(null);
                return;
            }
            const baseline = comparisonPreviewBaselineRef.current;
            try {
                await tryApplyRoot(baseline);
                if (showNotice) {
                    triggerComparisonNotice("success", "已恢复预览前的画布。");
                }
            } catch (error) {
                console.error("Reset comparison preview failed:", error);
            } finally {
                comparisonPreviewBaselineRef.current = null;
                setActiveComparisonPreview(null);
            }
        },
        [triggerComparisonNotice, tryApplyRoot]
    );

    const drawioPreviewBaseUrl =
        process.env.NEXT_PUBLIC_DRAWIO_PREVIEW_URL ??
        "https://viewer.diagrams.net/";

    const buildComparisonPreviewUrl = useCallback(
        (xmlOrEncoded: string) => {
            const trimmed = xmlOrEncoded?.trim();
            if (!trimmed) {
                return null;
            }
            try {
                const normalizedXml = trimmed.startsWith("<")
                    ? trimmed
                    : decodeDiagramXml(trimmed);
                if (!normalizedXml) {
                    return null;
                }
                const encoded = encodeDiagramXml(normalizedXml);
                const url = new URL(drawioPreviewBaseUrl);
                url.searchParams.set("lightbox", "1");
                url.searchParams.set("nav", "1");
                url.searchParams.set("highlight", "0000FF");
                url.searchParams.set("layers", "1");
                url.hash = `R${encoded}`;
                return url.toString();
            } catch (error) {
                console.error("Failed to build preview url:", error);
                return null;
            }
        },
        [drawioPreviewBaseUrl]
    );

    const normalizeComparisonResults = useCallback(
        (
            modelsMeta: ComparisonModelMeta[],
            rawResults: any[],
            defaultErrorMessage = "该模型未返回有效结果，请调整提示词后重试。"
        ): ComparisonCardResult[] => {
            const ensureString = (value: unknown) =>
                typeof value === "string" && value.trim().length > 0
                    ? value.trim()
                    : undefined;

            return modelsMeta.map((model, index) => {
                const item = rawResults?.[index] ?? {};
                const xml = ensureString(item?.xml);
                const encodedXml = ensureString(
                    item?.encodedXml ?? item?.compressedXml ?? item?.raw
                );
                const previewSvg = ensureString(
                    item?.previewSvg ?? item?.svg ?? item?.thumbnailSvg
                );
                const previewImage = ensureString(
                    item?.previewImage ??
                        item?.image ??
                        item?.thumbnail ??
                        item?.previewUrl
                );
                const rawId = ensureString(item?.id) ?? model.id;
                const status: ComparisonResultStatus =
                    item?.status === "error" || !xml ? "error" : "ok";

                return {
                    id: `${rawId}__${model.slot}`,
                    modelId: rawId,
                    label: ensureString(item?.label) ?? model.label,
                    provider: ensureString(item?.provider) ?? model.provider,
                    slot: model.slot,
                    status,
                    summary:
                        status === "ok" && ensureString(item?.summary)
                            ? ensureString(item?.summary)
                            : "",
                    xml: status === "ok" ? xml : undefined,
                    encodedXml: status === "ok" ? encodedXml : undefined,
                    previewSvg: status === "ok" ? previewSvg : undefined,
                    previewImage: status === "ok" ? previewImage : undefined,
                    error:
                        status === "error"
                            ? ensureString(item?.error) ?? defaultErrorMessage
                            : undefined,
                };
            });
        },
        []
    );

    const handleDownloadXml = useCallback(
        (result: ComparisonCardResult) => {
            if (result.status !== "ok" || !result.xml) {
                triggerComparisonNotice(
                    "error",
                    "该模型未返回可下载的 XML。"
                );
                return;
            }
            const blob = new Blob([result.xml], {
                type: "application/vnd.jgraph.mxfile",
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            const filename = `flowpilot-${result.modelId}-${Date.now()}.drawio`;
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);
            triggerComparisonNotice("success", "已导出 XML 文件。");
        },
        [triggerComparisonNotice]
    );

    const handleDiagramXml = useCallback(
        async (xml: string, meta: DiagramUpdateMeta) => {
            pendingDiagramRef.current = {
                xml,
                modelId: meta.modelId,
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
                        modelId: meta.modelId,
                    });
                } else {
                    throw error;
                }
            }
        },
        [runAutoRepair, tryApplyRoot]
    );

    const handleApplyComparisonResult = useCallback(
        async (result: ComparisonCardResult) => {
            if (result.status !== "ok" || !result.xml) {
                triggerComparisonNotice(
                    "error",
                    "该模型没有可应用的 XML 结果。"
                );
                return;
            }

            if (result.branchId) {
                const branch = switchBranch(result.branchId);
                if (branch) {
                    comparisonPreviewBaselineRef.current = null;
                    setActiveComparisonPreview(null);
                    setRequiresBranchDecision(false);
                    triggerComparisonNotice(
                        "success",
                        `已切换至「${branch.label}」，可继续在该版本上对话。`
                    );
                    return;
                }
            }

            try {
                await handleDiagramXml(result.xml, {
                    origin: "display",
                    modelId: result.modelId,
                });
                const branchMessages = cloneMessages(
                    activeBranch?.messages ?? []
                );
                const relatedEntry = comparisonHistory.find((entry) =>
                    entry.results.some((item) => item.id === result.id)
                );
                const created = createBranch({
                    label:
                        result.label?.trim()?.length
                            ? `${result.label} · 分支`
                            : `模型 ${result.slot} · 分支`,
                    diagramXml: result.xml,
                    meta: {
                        type: "comparison",
                        comparisonResultId: result.id,
                        comparisonRequestId: relatedEntry?.requestId,
                        label: result.label,
                    },
                    seedMessages: branchMessages,
                });
                if (created) {
                    attachBranchToResult(result.id, created.id);
                }
                comparisonPreviewBaselineRef.current = null;
                setActiveComparisonPreview(null);
                setRequiresBranchDecision(false);
                triggerComparisonNotice(
                    "success",
                    `已采用「${created?.label ?? result.label ?? result.modelId}」的画布，并开启新分支。`
                );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "应用模型输出失败，请稍后重试。";
                triggerComparisonNotice("error", message);
            }
        },
        [
            activeBranch,
            attachBranchToResult,
            comparisonHistory,
            createBranch,
            handleDiagramXml,
            switchBranch,
            triggerComparisonNotice,
        ]
    );

    const handlePreviewComparisonResult = useCallback(
        async (requestId: string, result: ComparisonCardResult) => {
            if (
                activeComparisonPreview &&
                activeComparisonPreview.requestId === requestId &&
                activeComparisonPreview.resultId === result.id
            ) {
                await clearComparisonPreview(true);
                return;
            }
            if (result.status !== "ok" || !result.xml) {
                triggerComparisonNotice(
                    "error",
                    "该模型未返回可预览的 XML。"
                );
                return;
            }
            try {
                if (!comparisonPreviewBaselineRef.current) {
                    comparisonPreviewBaselineRef.current =
                        latestDiagramXmlRef.current ||
                        chartXML ||
                        EMPTY_MXFILE;
                }
                await tryApplyRoot(result.xml);
                setActiveComparisonPreview({
                    requestId,
                    resultId: result.id,
                });
                triggerComparisonNotice(
                    "success",
                    `已预览「${result.label}」。`
                );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "预览时发生未知错误。";
                triggerComparisonNotice("error", `预览失败：${message}`);
            }
        },
        [
            activeComparisonPreview,
            chartXML,
            clearComparisonPreview,
            triggerComparisonNotice,
            tryApplyRoot,
        ]
    );

    useEffect(() => {
        if (!runtimeError) {
            return;
        }
        if (pendingDiagramRef.current) {
            runAutoRepair({
                invalidXml: pendingDiagramRef.current.xml,
                errorContext: runtimeError.message,
                modelId: pendingDiagramRef.current.modelId,
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

    const selectedModelMeta = useMemo(
        () => MODEL_PRESETS.find((preset) => preset.id === selectedModelId),
        [selectedModelId]
    );

    const briefContext = useMemo(() => {
        const intentMeta = INTENT_OPTIONS.find(
            (option) => option.id === briefState.intent
        );
        const toneMeta = TONE_OPTIONS.find(
            (option) => option.id === briefState.tone
        );
        const focusMeta = FOCUS_OPTIONS.filter((option) =>
            briefState.focus.includes(option.id)
        );
        const guardrailMeta = GUARDRAIL_OPTIONS.filter((option) =>
            briefState.guardrails.includes(option.id)
        );

        const segments: string[] = [];
        const badges: string[] = [];

        if (intentMeta) {
            segments.push(`模式：「${intentMeta.title}」— ${intentMeta.prompt}`);
            badges.push(`模式·${intentMeta.title}`);
        }
        if (toneMeta) {
            segments.push(`视觉：${toneMeta.prompt}`);
            badges.push(`视觉·${toneMeta.title}`);
        }
        if (focusMeta.length > 0) {
            segments.push(
                `重点：${focusMeta.map((item) => item.prompt).join("；")}`
            );
            focusMeta.forEach((item) => badges.push(`重点·${item.title}`));
        }
        if (guardrailMeta.length > 0) {
            segments.push(
                `护栏：${guardrailMeta.map((item) => item.prompt).join("；")}`
            );
            guardrailMeta.forEach((item) => badges.push(`护栏·${item.title}`));
        }

        const prompt =
            segments.length > 0
                ? `### FlowPilot Brief\\n${segments
                      .map((segment) => `- ${segment}`)
                      .join("\\n")}`
                : "";

        return { prompt, badges };
    }, [briefState]);

    const { messages, sendMessage, addToolResult, status, error, setMessages } =
        useChat({
            transport: new DefaultChatTransport({
                api: "/api/chat",
            }),
            async onToolCall({ toolCall }) {
                if (toolCall.toolName === "display_diagram") {
                    addToolResult({
                        tool: "display_diagram",
                        toolCallId: toolCall.toolCallId,
                        output: "Successfully displayed the diagram.",
                    });
                } else if (toolCall.toolName === "edit_diagram") {
                    const { edits } = toolCall.input as {
                        edits: Array<{ search: string; replace: string }>;
                    };

                    let currentXml = '';
                    try {
                        currentXml = await onFetchChart();
                        const editedXml = replaceXMLParts(currentXml, edits);
                        latestDiagramXmlRef.current = editedXml;
                        pendingDiagramRef.current = {
                            xml: editedXml,
                            modelId: selectedModelId,
                            source: "edit",
                        };
                        onDisplayChart(editedXml);

                        addToolResult({
                            tool: "edit_diagram",
                            toolCallId: toolCall.toolCallId,
                            output: `Successfully applied ${edits.length} edit(s) to the diagram.`,
                        });
                    } catch (error) {
                        console.error("Edit diagram failed:", error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        addToolResult({
                            tool: "edit_diagram",
                            toolCallId: toolCall.toolCallId,
                            output: `Failed to edit diagram: ${errorMessage}`,
                        });
                    }
                }
            },
            onError: (error) => {
                console.error("Chat error:", error);
            },
        });

    // 监听消息变化，自动启动对话状态
    useEffect(() => {
        const userMessages = messages.filter((message) => message.role === "user");
        if (userMessages.length > 0 && !isConversationStarted) {
            startConversation();
        }
        if (userMessages.length > messageCount) {
            incrementMessageCount();
        }
    }, [messages, isConversationStarted, messageCount, startConversation, incrementMessageCount]);

    useEffect(() => {
        if (isConversationStarted) {
            setActiveToolPanel(null);
            setIsToolSidebarOpen(false);
        }
    }, [isConversationStarted]);

    useEffect(() => {
        if (!activeBranch) {
            return;
        }
        if (activeBranch.messages === messages) {
            return;
        }
        updateActiveBranchMessages(messages);
    }, [messages, activeBranch, updateActiveBranchMessages]);

    useEffect(() => {
        if (input.trim().length > 0 && activeToolPanel) {
            setActiveToolPanel(null);
            setIsToolSidebarOpen(false);
        }
    }, [input, activeToolPanel]);

    useEffect(() => {
        setComparisonConfig((prev) => {
            if (
                prev.primary === DEFAULT_MODEL_ID &&
                selectedModelId !== prev.primary
            ) {
                return { ...prev, primary: selectedModelId };
            }
            return prev;
        });
    }, [selectedModelId]);

    const handleCompareRequest = useCallback(async () => {
        if (!ensureBranchSelectionSettled()) {
            return;
        }
        if (status === "streaming" || isComparisonRunning) {
            triggerComparisonNotice(
                "error",
                "AI 正在回答其他请求，请稍后再试。"
            );
            return;
        }
        if (!input.trim()) {
            triggerComparisonNotice("error", "请输入提示词后再进行对比。");
            return;
        }
        const primaryId = comparisonConfig.primary?.trim();
        const secondaryId = comparisonConfig.secondary?.trim();
        if (!primaryId || !secondaryId) {
            triggerComparisonNotice(
                "error",
                "请先在对比设置中选择两个模型。"
            );
            setIsComparisonConfigOpen(true);
            return;
        }

        await clearComparisonPreview();

        const modelsMeta: ComparisonModelMeta[] = [
            {
                id: primaryId,
                label: `${resolvePresetLabel(primaryId)} · 模型 A`,
                provider: resolvePresetProvider(primaryId),
                slot: "A",
            },
            {
                id: secondaryId,
                label: `${resolvePresetLabel(secondaryId)} · 模型 B`,
                provider: resolvePresetProvider(secondaryId),
                slot: "B",
            },
        ];

        const enrichedInput =
            briefContext.prompt.length > 0
                ? `${briefContext.prompt}\n\n${input}`
                : input;
        const originBranchId = activeBranchId;
        const branchSeedMessages = cloneMessages(
            activeBranch?.messages ?? []
        );

        const requestId = createComparisonEntry({
            prompt: enrichedInput,
            badges: briefContext.badges,
            models: modelsMeta,
        });
        setRequiresBranchDecision(true);

        try {
            setIsComparisonRunning(true);

            let chartXml = await onFetchChart();
            chartXml = formatXML(chartXml);

            const attachments =
                files.length > 0 ? await serializeAttachments(files) : [];

            const requestBody: Record<string, any> = {
                models: modelsMeta.map((model) => ({
                    id: model.id,
                    label: model.label,
                })),
                prompt: enrichedInput,
                xml: chartXml,
                brief: briefContext.prompt,
            };

            if (attachments.length > 0) {
                requestBody.attachments = attachments;
            }

            const response = await fetch("/api/model-compare", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    errorText || "模型对比接口返回错误，请稍后再试。"
                );
            }

            const data = await response.json();
            const rawResults: any[] = Array.isArray(data?.results)
                ? data.results
                : [];

            const normalizedResults = normalizeComparisonResults(
                modelsMeta,
                rawResults
            );
            const bindings = createComparisonBranchesForResults(
                requestId,
                normalizedResults,
                originBranchId,
                branchSeedMessages
            );
            const enrichedResults = normalizedResults.map((result) => ({
                ...result,
                branchId: bindings[result.id],
            }));
            const hasUsableBranch = hasUsableComparisonOutput(
                normalizedResults
            );
            if (!hasUsableBranch) {
                setRequiresBranchDecision(false);
            }

            updateComparisonEntry(requestId, (entry) => ({
                ...entry,
                status: "ready",
                prompt: enrichedInput,
                results: enrichedResults,
            }));

            const allError = normalizedResults.every(
                (result) => result.status === "error"
            );
            triggerComparisonNotice(
                allError ? "error" : "success",
                allError
                    ? "两个模型均未返回有效结果，请检查提示词或模型设置。"
                    : "模型对比完成，结果已展示在对话中。"
            );
        } catch (error) {
            console.error("Model comparison failed:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : "模型对比失败，请稍后重试。";
            const fallbackResults: ComparisonCardResult[] = modelsMeta.map(
                (model) => ({
                    id: `${model.id}__${model.slot}`,
                    modelId: model.id,
                    label: model.label,
                    provider: model.provider,
                    slot: model.slot,
                    status: "error",
                    summary: "",
                    xml: undefined,
                    encodedXml: undefined,
                    previewSvg: undefined,
                    previewImage: undefined,
                    error: message,
                })
            );
            const bindings = createComparisonBranchesForResults(
                requestId,
                fallbackResults,
                originBranchId,
                branchSeedMessages
            );
            const enrichedFallback = fallbackResults.map((result) => ({
                ...result,
                branchId: bindings[result.id],
            }));
            updateComparisonEntry(requestId, (entry) => ({
                ...entry,
                status: "ready",
                prompt: enrichedInput,
                results: enrichedFallback,
            }));
            triggerComparisonNotice("error", message);
            setRequiresBranchDecision(false);
        } finally {
            setIsComparisonRunning(false);
        }
    }, [
        status,
        isComparisonRunning,
        input,
        comparisonConfig.primary,
        comparisonConfig.secondary,
        clearComparisonPreview,
        briefContext.prompt,
        briefContext.badges,
        activeBranch,
        activeBranchId,
        createComparisonEntry,
        onFetchChart,
        files,
        serializeAttachments,
        ensureBranchSelectionSettled,
        updateComparisonEntry,
        resolvePresetLabel,
        resolvePresetProvider,
        normalizeComparisonResults,
        triggerComparisonNotice,
        createComparisonBranchesForResults,
        setRequiresBranchDecision,
    ]);

    const handleRetryComparisonResult = useCallback(
        async (
            entry: ComparisonHistoryEntry,
            targetResult: ComparisonCardResult
        ) => {
            if (!ensureBranchSelectionSettled()) {
                return;
            }
            if (isComparisonRunning) {
                triggerComparisonNotice(
                    "error",
                    "当前已有对比任务正在执行，请稍后再试。"
                );
                return;
            }
            if (!entry || !targetResult) {
                return;
            }

            await clearComparisonPreview();
            const originBranchId = activeBranchId;
            const branchSeedMessages = cloneMessages(
                activeBranch?.messages ?? []
            );
            setRequiresBranchDecision(true);

            const previousSnapshot = { ...targetResult };

            updateComparisonEntry(entry.requestId, (current) => ({
                ...current,
                status: "loading",
                results: current.results.map((item) =>
                    item.id === targetResult.id
                        ? {
                              ...item,
                              status: "loading",
                              summary: "",
                              xml: undefined,
                              encodedXml: undefined,
                              previewSvg: undefined,
                              previewImage: undefined,
                              error: undefined,
                          }
                        : item
                ),
            }));

            try {
                setIsComparisonRunning(true);

                let chartXml = await onFetchChart();
                chartXml = formatXML(chartXml);

                const response = await fetch("/api/model-compare", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        models: entry.models.map((model) => ({
                            id: model.id,
                            label: model.label,
                        })),
                        prompt: entry.prompt,
                        xml: chartXml,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(
                        errorText || "模型对比接口返回错误，请稍后再试。"
                    );
                }

                const data = await response.json();
                const rawResults: any[] = Array.isArray(data?.results)
                    ? data.results
                    : [];

                const normalizedResults = normalizeComparisonResults(
                    entry.models,
                    rawResults
                );
                const bindings = createComparisonBranchesForResults(
                    entry.requestId,
                    normalizedResults,
                    originBranchId,
                    branchSeedMessages
                );
                const enrichedResults = normalizedResults.map((result) => ({
                    ...result,
                    branchId: bindings[result.id],
                }));
                const hasUsableBranch = hasUsableComparisonOutput(
                    normalizedResults
                );
                if (!hasUsableBranch) {
                    setRequiresBranchDecision(false);
                }

                updateComparisonEntry(entry.requestId, (current) => ({
                    ...current,
                    status: "ready",
                    results: enrichedResults,
                }));

                triggerComparisonNotice("success", "已重新生成模型输出。");
            } catch (error) {
                console.error("Retry model comparison failed:", error);
                const message =
                    error instanceof Error
                        ? error.message
                        : "重新生成失败，请稍后重试。";

                updateComparisonEntry(entry.requestId, (current) => ({
                    ...current,
                    status: "ready",
                    results: current.results.map((item) =>
                        item.id === targetResult.id
                            ? {
                                  ...previousSnapshot,
                                  status: "error",
                                  error: message,
                              }
                            : item
                    ),
                }));

                triggerComparisonNotice("error", message);
                setRequiresBranchDecision(false);
            } finally {
                setIsComparisonRunning(false);
            }
        },
        [
            isComparisonRunning,
            clearComparisonPreview,
            onFetchChart,
            normalizeComparisonResults,
            updateComparisonEntry,
            triggerComparisonNotice,
            activeBranch,
            activeBranchId,
            createComparisonBranchesForResults,
            ensureBranchSelectionSettled,
            setRequiresBranchDecision,
        ]
    );

    const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!ensureBranchSelectionSettled()) {
            return;
        }
        if (input.trim() && status !== "streaming") {
            try {
                let chartXml = await onFetchChart();
                chartXml = formatXML(chartXml);

                const enrichedInput =
                    briefContext.prompt.length > 0
                        ? `${briefContext.prompt}\\n\\n${input}`
                        : input;

                const parts: any[] = [{ type: "text", text: enrichedInput }];

                if (files.length > 0) {
                    for (const file of files) {
                        const reader = new FileReader();
                        const dataUrl = await new Promise<string>((resolve) => {
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                        });

                        parts.push({
                            type: "file",
                            url: dataUrl,
                            mediaType: file.type,
                        });
                    }
                }

                sendMessage(
                    { parts },
                    {
                        body: {
                            xml: chartXml,
                            modelOverride: selectedModelId,
                        },
                    }
                );

                setInput("");
                handleFileChange([]);
            } catch (error) {
                console.error("Error fetching chart data:", error);
            }
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setInput(e.target.value);
    };

    const handleFileChange = (newFiles: File[]) => {
        setFiles(newFiles);
    };

    const quickActions: QuickActionDefinition[] = [
        {
            id: "aws-refresh",
            title: "重建这张 AWS 架构图",
            description:
                "使用最新版 AWS 图标与规范化间距重新规划画布。",
            prompt:
                "请读取当前架构图，在 800x600 画布范围内，使用 2025 版 AWS 图标、简洁标签与均衡间距重新绘制。",
            badge: "架构",
            attachment: {
                path: "/architecture.png",
                fileName: "architecture.png",
                mime: "image/png",
            },
        },
        {
            id: "journey",
            title: "客户旅程地图",
            description:
                "展示四个阶段的目标、触点与情绪。",
            prompt:
                "请绘制一个包含发现、考虑、采用、支持四个阶段的客户旅程图，并加入目标、触点、情绪泳道以及各阶段之间的箭头。",
            badge: "策略",
        },
        {
            id: "polish",
            title: "润色当前图表",
            description:
                "优化间距、对齐节点并突出主流程。",
            prompt:
                "请检查当前图表，整理布局、对齐相关节点，并为每条泳道添加淡色区分，保持原有内容不变。",
            badge: "整理",
        },
        {
            id: "explain",
            title: "解释当前图表",
            description:
                "总结结构并提出下一步优化建议。",
            prompt:
                "请阅读当前图表 XML，为产品经理总结其结构，并给出一条影响最大的改进建议，暂不修改图表。",
            badge: "洞察",
        },
    ];

    const handleAICalibrationRequest = async () => {
        if (!ensureBranchSelectionSettled()) {
            throw new Error("请先处理对比结果，再执行校准。");
        }
        if (status === "streaming") {
            throw new Error("AI 正在回答其他请求，请稍后再试。");
        }

        let chartXml = await onFetchChart();
        chartXml = formatXML(chartXml);

        if (!chartXml.trim()) {
            throw new Error("当前画布为空，无法执行校准。");
        }

        await sendMessage(
            {
                parts: [
                    {
                        type: "text",
                        text: FLOWPILOT_AI_CALIBRATION_PROMPT,
                    },
                ],
            },
            {
                body: {
                    xml: chartXml,
                    modelOverride: selectedModelId,
                },
            }
        );
    };

    const handleQuickAction = async (action: QuickActionDefinition) => {
        if (status === "streaming") return;
        if (!ensureBranchSelectionSettled()) return;
        setInput(action.prompt);

        if (action.attachment) {
            try {
                const response = await fetch(action.attachment.path);
                const blob = await response.blob();
                const file = new File([blob], action.attachment.fileName, {
                    type: action.attachment.mime,
                });
                handleFileChange([file]);
            } catch (err) {
                console.error("Failed to attach reference asset:", err);
            }
        } else if (files.length > 0) {
            handleFileChange([]);
        }
    };

    const handleBlueprintTemplate = (prompt: string) => {
        if (status === "streaming") return;
        if (!ensureBranchSelectionSettled()) return;
        setInput(prompt);
        if (files.length > 0) {
            handleFileChange([]);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        resetActiveBranch();
        updateActiveBranchDiagram(EMPTY_MXFILE);
        clearDiagram();
        clearConversation();
        setComparisonHistory([]);
        setComparisonNotice(null);
        comparisonPreviewBaselineRef.current = null;
        setActiveComparisonPreview(null);
        setRequiresBranchDecision(false);
    };

    const exchanges = messages.filter(
        (message) => message.role === "user" || message.role === "assistant"
    ).length;

    const toggleToolPanel = (panel: ToolPanel) => {
        setActiveToolPanel((current) => {
            const next = current === panel ? null : panel;
            setIsToolSidebarOpen(next !== null);
            return next;
        });
    };

    const closeToolSidebar = () => {
        setActiveToolPanel(null);
        setIsToolSidebarOpen(false);
    };

    useEffect(() => {
        if (!activeBranch) {
            return;
        }
        const branchChanged = lastBranchIdRef.current !== activeBranchId;
        const messagesMismatch = activeBranch.messages !== messages;

        if (branchChanged && activeBranch.diagramXml) {
            (async () => {
                try {
                    await handleDiagramXml(activeBranch.diagramXml!, {
                        origin: "display",
                        modelId: activeBranch.meta?.comparisonResultId,
                    });
                } catch (error) {
                    console.error("切换分支应用画布失败：", error);
                }
            })();
        }

        if (branchChanged && messagesMismatch) {
            setMessages(activeBranch.messages);
        }

        if (branchChanged) {
            lastBranchIdRef.current = activeBranchId;
        }
    }, [
        activeBranch,
        activeBranchId,
        handleDiagramXml,
        messages,
        setMessages,
    ]);

    const handleMessageRevert = useCallback(
        ({ messageId, text }: { messageId: string; text: string }) => {
            const targetIndex = messages.findIndex(
                (message) => message.id === messageId
            );
            if (targetIndex < 0) {
                return;
            }
            const truncated = messages.slice(0, targetIndex);
            const labelSuffix =
                targetIndex + 1 <= 9
                    ? `0${targetIndex + 1}`
                    : `${targetIndex + 1}`;
            const revertBranch = createBranch({
                parentId: activeBranchId,
                label: `回滚 · 消息 ${labelSuffix}`,
                meta: {
                    type: "history",
                    label: `消息 ${labelSuffix}`,
                },
                diagramXml: activeBranch?.diagramXml ?? null,
                seedMessages: truncated,
                inheritMessages: false,
            });
            setMessages(truncated);
            setInput(text ?? "");
            if (!revertBranch) {
                updateActiveBranchMessages(truncated);
            }
            setRequiresBranchDecision(false);
        },
        [
            activeBranch,
            activeBranchId,
            createBranch,
            messages,
            setMessages,
            setInput,
            updateActiveBranchMessages,
            setRequiresBranchDecision,
        ]
    );

    const renderToolPanel = () => {
        if (!activeToolPanel) return null;

        if (activeToolPanel === "brief") {
            return (
                <FlowPilotBriefLauncher
                    state={briefState}
                    onChange={(next) =>
                        setBriefState((prev) => ({ ...prev, ...next }))
                    }
                    disabled={status === "streaming"}
                    badges={briefContext.badges}
                />
            );
        }

        if (activeToolPanel === "calibration") {
            return (
                <CalibrationConsole
                    disabled={status === "streaming" || requiresBranchDecision}
                    onFetchChart={onFetchChart}
                    onAiCalibrate={handleAICalibrationRequest}
                />
            );
        }

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        快速复用灵感或述职模板
                    </div>
                    <div className="inline-flex rounded-full bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setCommandTab("starter")}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold transition",
                                commandTab === "starter"
                                    ? "bg-white text-slate-900 shadow"
                                    : "text-slate-500"
                            )}
                        >
                            灵感起稿
                        </button>
                        <button
                            type="button"
                            onClick={() => setCommandTab("report")}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold transition",
                                commandTab === "report"
                                    ? "bg-white text-slate-900 shadow"
                                    : "text-slate-500"
                            )}
                        >
                            述职模板
                        </button>
                    </div>
                </div>
                {commandTab === "starter" ? (
                    <QuickActionBar
                        actions={quickActions}
                        disabled={status === "streaming" || requiresBranchDecision}
                        onSelect={handleQuickAction}
                        variant="plain"
                        title=""
                        subtitle=""
                    />
                ) : (
                    <ReportBlueprintTray
                        disabled={status === "streaming" || requiresBranchDecision}
                        onUseTemplate={(template) =>
                            handleBlueprintTemplate(template.prompt)
                        }
                    />
                )}
            </div>
        );
    };

    const toolbarPanels: ToolPanel[] = ["brief", "calibration", "actions"];
    const activePanelConfig = activeToolPanel
        ? TOOLBAR_ACTIONS[activeToolPanel]
        : null;
    const ActivePanelIcon = activePanelConfig?.icon ?? null;
    const showSessionStatus = !isCompactMode || !isConversationStarted;
    const sidebarTitle = activePanelConfig ? `智能${activePanelConfig.label}` : "";
    const shouldShowSidebar = Boolean(
        isToolSidebarOpen && activePanelConfig && ActivePanelIcon
    );

    return (
        <>
        <Card className="relative flex h-full min-h-0 flex-col gap-0 rounded-none py-0">
            <CardHeader className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-3 py-2">
                <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold tracking-tight text-slate-900">
                            FlowPilot 智能流程图
                        </CardTitle>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                            studio
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isConversationStarted && (
                            <button
                                type="button"
                                onClick={toggleCompactMode}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white"
                                aria-label={isCompactMode ? "展开输入工具" : "精简输入工具"}
                            >
                                {isCompactMode ? (
                                    <ListPlus className="h-4 w-4" />
                                ) : (
                                    <ListMinus className="h-4 w-4" />
                                )}
                            </button>
                        )}
                        <a
                            href="https://github.com/DayuanJiang/next-ai-draw-io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white"
                            aria-label="在 GitHub 查看源码"
                        >
                            <FaGithub className="h-4 w-4" />
                        </a>
                        {isCollapsible && (
                            <button
                                type="button"
                                onClick={onCollapse}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white"
                                aria-label="收起聊天"
                            >
                                <PanelRightClose className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                {showSessionStatus && (
                    <SessionStatus
                        variant="inline"
                        status={status}
                        providerLabel={selectedModelMeta?.label || selectedModelId}
                        diagramVersions={
                            diagramHistory.length > 0
                                ? diagramHistory.length
                                : chartXML
                                ? 1
                                : 0
                        }
                        attachmentCount={files.length}
                        exchanges={exchanges}
                    />
                )}
            </CardHeader>
            <CardContent className="flex flex-1 min-h-0 flex-col px-3 pb-3 pt-2">
                <div className="flex flex-1 min-h-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100/70 bg-white/60 px-3 py-2">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            <Sparkles className="h-3.5 w-3.5 text-slate-300" />
                            智能工具
                        </div>
                        <div className="flex items-center gap-1.5">
                            {toolbarPanels.map((panel) => {
                                const { label, icon: Icon } = TOOLBAR_ACTIONS[panel];
                                const isActive = activeToolPanel === panel && isToolSidebarOpen;
                                return (
                                    <button
                                        key={panel}
                                        type="button"
                                        onClick={() => toggleToolPanel(panel)}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-[11px] font-medium transition",
                                            isActive
                                                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                                : "border-slate-200/60 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-white"
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {autoRepairState.status !== "idle" && (
                        <div
                            className={cn(
                                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                                autoRepairState.status === "repairing"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-red-200 bg-red-50 text-red-600"
                            )}
                        >
                            {autoRepairState.status === "repairing" ? (
                                <>
                                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                                    <span>
                                        {autoRepairState.message ||
                                            "捕捉到 draw.io 错误，正在自动修复..."}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <X className="h-3 w-3" />
                                    <span>
                                        {autoRepairState.message ||
                                            "自动修复失败，请重新生成或调整指令。"}
                                    </span>
                                </>
                            )}
                            {autoRepairState.notes && (
                                <div className="ml-4 flex flex-col gap-1 text-[11px] leading-snug text-slate-700">
                                    {Array.isArray(autoRepairState.notes)
                                        ? autoRepairState.notes.map((note, index) => (
                                              <div key={index} className="flex items-start gap-1">
                                                  <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
                                                  <span className="flex-1">{note}</span>
                                              </div>
                                          ))
                                        : autoRepairState.notes}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="relative flex-1 min-h-0">
                        {comparisonNotice && (
                            <div
                                className={cn(
                                    "mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                                    comparisonNotice.type === "success"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-red-200 bg-red-50 text-red-600"
                                )}
                            >
                                {comparisonNotice.type === "success" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                )}
                                <span className="leading-snug">
                                    {comparisonNotice.message}
                                </span>
                            </div>
                        )}
                        <div className="h-full overflow-hidden rounded-xl border border-slate-100/70 bg-white/90 px-2 py-2">
                            <ChatMessageDisplay
                                messages={messages}
                                error={error}
                                setInput={setInput}
                                setFiles={handleFileChange}
                                onDisplayDiagram={(xml) =>
                                    handleDiagramXml(xml, {
                                        origin: "display",
                                        modelId: selectedModelId,
                                    })
                                }
                                onComparisonApply={(result) => {
                                    void handleApplyComparisonResult(result);
                                }}
                                onComparisonCopyXml={handleCopyXml}
                                onComparisonDownload={handleDownloadXml}
                                onComparisonPreview={(requestId, result) => {
                                    void handlePreviewComparisonResult(requestId, result);
                                }}
                                onComparisonRetry={handleRetryComparisonResult}
                                buildComparisonPreviewUrl={buildComparisonPreviewUrl}
                            comparisonHistory={comparisonHistory}
                                activePreview={activeComparisonPreview}
                                onMessageRevert={handleMessageRevert}
                            />
                        </div>
                        {shouldShowSidebar && ActivePanelIcon && (
                            <div className="pointer-events-none absolute inset-0 flex items-start justify-end px-2 pb-3 pt-3">
                                <aside className="pointer-events-auto w-full max-w-full rounded-2xl border border-slate-100/80 bg-white/95 p-4 shadow-xl ring-1 ring-slate-900/5 sm:max-w-lg md:max-w-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ActivePanelIcon className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm font-semibold text-slate-900">
                                                {sidebarTitle}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeToolSidebar}
                                            className="text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
                                        >
                                            收起
                                        </button>
                                    </div>
                                    <p className="mt-2 text-[11px] leading-snug text-slate-500">
                                        {activePanelConfig?.description}
                                    </p>
                                    <div className="mt-3 max-h-[55vh] overflow-y-auto pr-1">
                                        {renderToolPanel()}
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="shrink-0 bg-background p-3">
                <ChatInputOptimized
                    input={input}
                    status={status}
                    onSubmit={onFormSubmit}
                    onChange={handleInputChange}
                    onClearChat={handleClearChat}
                    files={files}
                    onFileChange={handleFileChange}
                    showHistory={showHistory}
                    onToggleHistory={setShowHistory}
                    isCompactMode={isCompactMode && isConversationStarted}
                    selectedModelId={selectedModelId}
                    onModelChange={setSelectedModelId}
                    onCompareRequest={handleCompareRequest}
                    onOpenComparisonConfig={() => setIsComparisonConfigOpen(true)}
                    isCompareLoading={isComparisonRunning}
                    interactionLocked={requiresBranchDecision}
                />
            </CardFooter>

        </Card>
        <ModelComparisonConfigDialog
            open={isComparisonConfigOpen}
            onOpenChange={setIsComparisonConfigOpen}
            config={comparisonConfig}
            onConfigChange={setComparisonConfig}
            defaultPrimaryId={selectedModelId}
        />
        </>
    );
}
