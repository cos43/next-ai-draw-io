"use client";

import type React from "react";
import { useMemo, useState, useEffect } from "react";
import { FaGithub } from "react-icons/fa";
import {
    ListMinus,
    ListPlus,
    PanelRightClose,
    Settings,
    Zap,
    FileText,
    Sparkles,
    X,
    Download,
    Eye,
    Loader2,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInputOptimized } from "@/components/chat-input-optimized";
import { ChatMessageDisplay } from "./chat-message-display";
import { useDiagram } from "@/contexts/diagram-context";
import { cn, formatXML } from "@/lib/utils";
import { SessionStatus } from "./session-status";
import {
    QuickActionBar,
    QuickActionDefinition,
} from "./quick-action-bar";
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
import { DiagramTimelineRail } from "./diagram-timeline-rail";
import { DEFAULT_MODEL_ID, MODEL_PRESETS } from "@/lib/model-constants";

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

type ComparisonResult = {
    id: string;
    label: string;
    provider: string;
    status: "ok" | "error";
    summary?: string;
    xml?: string;
    error?: string;
};

type AttachmentPayload = {
    url: string;
    mediaType: string;
};

interface ChatPanelProps {
    onCollapse?: () => void;
    isCollapsible?: boolean;
}

export default function ChatPanelOptimized({
    onCollapse,
    isCollapsible = false,
}: ChatPanelProps) {
    const {
        loadDiagram: onDisplayChart,
        handleExport: onExport,
        resolverRef,
        chartXML,
        clearDiagram,
        diagramHistory,
        restoreDiagramAt,
        activeVersionIndex,
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

    const onFetchChart = () => {
        return Promise.race([
            new Promise<string>((resolve) => {
                if (resolverRef && "current" in resolverRef) {
                    resolverRef.current = resolve;
                }
                onExport();
            }),
            new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error("Chart export timed out after 10 seconds")), 10000)
            )
        ]);
    };

    // State management
    const [files, setFiles] = useState<File[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [input, setInput] = useState("");
    const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
    const [isModelStrategyExpanded, setIsModelStrategyExpanded] = useState(false);
    const [comparisonPrompt, setComparisonPrompt] = useState("");
    const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [briefState, setBriefState] = useState<FlowPilotBriefState>({
        intent: "draft",
        tone: "balanced",
        focus: ["swimlane"],
        guardrails: ["singleViewport", "respectLabels"],
    });
    const [commandTab, setCommandTab] = useState<"starter" | "report">("starter");
    const [activeToolPanel, setActiveToolPanel] = useState<ToolPanel | null>(null);
    const [lastToolPanel, setLastToolPanel] = useState<ToolPanel>("brief");

    const selectedModelMeta = useMemo(
        () => MODEL_PRESETS.find((preset) => preset.id === selectedModelId),
        [selectedModelId]
    );
    const providerLabel = selectedModelMeta
        ? selectedModelMeta.label
        : `自定义 · ${selectedModelId}`;

    const wanqingModels = useMemo(
        () => MODEL_PRESETS.filter(preset => preset.provider === "wanqing"),
        []
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
                        const { replaceXMLParts } = await import("@/lib/utils");
                        const editedXml = replaceXMLParts(currentXml, edits);
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
        }
    }, [isConversationStarted]);

    useEffect(() => {
        if (input.trim().length > 0 && activeToolPanel) {
            setActiveToolPanel(null);
        }
    }, [input, activeToolPanel]);

    const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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

    // 序列化文件用于对比
    const serializeFilesForComparison = async (): Promise<AttachmentPayload[]> => {
        const imageFiles = files.filter((file) => file.type.startsWith("image/"));
        return Promise.all(
            imageFiles.map(
                (file) =>
                    new Promise<AttachmentPayload>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onerror = () => reject(new Error("读取图片失败"));
                        reader.onload = () =>
                            resolve({
                                url: reader.result as string,
                                mediaType: file.type,
                            });
                        reader.readAsDataURL(file);
                    })
            )
        );
    };

    // 晚晴模型对比处理函数
    const handleWanqingModelComparison = async () => {
        if (comparisonPrompt.trim().length === 0) return;
        
        setIsComparing(true);
        setComparisonResults([]);
        
        try {
            let chartXml = chartXML || "";
            try {
                const exportedXml = await onFetchChart();
                if (exportedXml) {
                    chartXml = formatXML(exportedXml);
                }
            } catch (err) {
                console.warn("导出画布用于对比失败，使用最近一次的 XML。", err);
            }

            const attachmentsPayload = await serializeFilesForComparison();
            
            const response = await fetch("/api/model-compare", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    models: wanqingModels.map((preset) => ({ id: preset.id, label: preset.label })),
                    prompt: comparisonPrompt.trim(),
                    xml: chartXml,
                    brief: briefContext.prompt,
                    attachments: attachmentsPayload,
                }),
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error ?? "对比失败，请稍后重试。");
            }
            setComparisonResults(data.results ?? []);
        } catch (error) {
            console.error("模型对比失败:", error);
        } finally {
            setIsComparing(false);
        }
    };

    // 选择对比结果并继续对话
    const handleSelectComparisonResult = (result: ComparisonResult) => {
        if (result.status !== "ok" || !result.xml) return;
        
        // 切换到对应的模型
        setSelectedModelId(result.id);
        
        // 应用选中的XML到画布
        onDisplayChart(result.xml);
        
        // 清空对比结果，准备继续对话
        setComparisonResults([]);
        setComparisonPrompt("");
        
        // 收起模型策略区域
        setIsModelStrategyExpanded(false);
    };

    // 预览对比结果
    const handlePreviewComparisonResult = (result: ComparisonResult) => {
        if (result.status !== "ok" || !result.xml) return;
        onDisplayChart(result.xml);
        window.setTimeout(() => {
            try {
                onExport();
            } catch (err) {
                console.warn("导出对比结果失败", err);
            }
        }, 400);
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
        setInput(prompt);
        if (files.length > 0) {
            handleFileChange([]);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        clearDiagram();
        clearConversation();
        setComparisonResults([]);
    };

    const exchanges = messages.filter(
        (message) => message.role === "user" || message.role === "assistant"
    ).length;

    const toggleToolPanel = (panel: ToolPanel) => {
        setActiveToolPanel((current) => {
            const next = current === panel ? null : panel;
            if (next) {
                setLastToolPanel(next);
            }
            return next;
        });
    };

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
                    disabled={status === "streaming"}
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
                        disabled={status === "streaming"}
                        onSelect={handleQuickAction}
                        variant="plain"
                        title=""
                        subtitle=""
                    />
                ) : (
                    <ReportBlueprintTray
                        disabled={status === "streaming"}
                        onUseTemplate={(template) =>
                            handleBlueprintTemplate(template.prompt)
                        }
                    />
                )}
            </div>
        );
    };

    const toolbarPanels: ToolPanel[] = ["brief", "calibration", "actions"];
    const ActivePanelIcon = activeToolPanel ? TOOLBAR_ACTIONS[activeToolPanel].icon : null;
    const showSessionStatus = !isCompactMode || !isConversationStarted;
    const floatingLabel = TOOLBAR_ACTIONS[lastToolPanel].label;

    return (
        <Card className="relative flex h-full min-h-0 flex-col gap-0 rounded-none py-0">
            <CardHeader className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold tracking-tight text-slate-900">
                        FlowPilot 智能画布
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
            </CardHeader>
            <CardContent className="flex flex-1 min-h-0 flex-col gap-2 px-3 pb-2 pt-2">
                {/* 工具栏 */}
                <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            工具栏
                        </span>
                        <div className="flex items-center gap-1.5">
                            {toolbarPanels.map((panel) => {
                                const { label, icon: Icon } = TOOLBAR_ACTIONS[panel];
                                const isActive = activeToolPanel === panel;
                                return (
                                    <button
                                        key={panel}
                                        type="button"
                                        onClick={() => toggleToolPanel(panel)}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
                                            isActive
                                                ? "border-slate-900 bg-slate-900 text-white shadow"
                                                : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300"
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 工具面板 */}
                {activeToolPanel && ActivePanelIcon && (
                    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg">
                        <div className="mb-2 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ActivePanelIcon className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm font-semibold text-slate-900">
                                        智能{TOOLBAR_ACTIONS[activeToolPanel].label}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {TOOLBAR_ACTIONS[activeToolPanel].description}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveToolPanel(null)}
                                className="text-[11px] font-semibold text-slate-500 transition hover:text-slate-900"
                            >
                                收起
                            </button>
                        </div>
                        <div className="max-h-[45vh] overflow-y-auto pr-1">
                            {renderToolPanel()}
                        </div>
                    </div>
                )}

                {/* 模型策略区域 */}
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <Sparkles className="h-4 w-4 text-amber-400" />
                                模型策略
                            </div>
                            <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                                {providerLabel}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsModelStrategyExpanded(!isModelStrategyExpanded)}
                            className="text-[11px] font-semibold text-slate-500 transition hover:text-slate-900"
                        >
                            {isModelStrategyExpanded ? "收起" : "展开"}
                        </button>
                    </div>
                    
                    {isModelStrategyExpanded && (
                        <>
                            <div className="flex flex-wrap gap-2">
                                {MODEL_PRESETS.map((preset) => {
                                    const isActive = preset.id === selectedModelId;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => setSelectedModelId(preset.id)}
                                            className={cn(
                                                "rounded-full border px-3 py-1 text-sm font-medium transition",
                                                isActive
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                            )}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600">
                                        晚晴模型对比
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        同一提示词，多个模型同时生成
                                    </span>
                                </div>
                                
                                <div className="space-y-2">
                                    <textarea
                                        value={comparisonPrompt}
                                        onChange={(e) => setComparisonPrompt(e.target.value)}
                                        className="w-full min-h-[72px] rounded-md border border-slate-200 bg-white/90 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                                        placeholder="描述希望生成的图表内容，我们将使用晚晴的不同模型同时生成…"
                                    />
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setComparisonPrompt(input)}
                                            className="text-xs font-semibold text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline disabled:opacity-60"
                                            disabled={input.trim().length === 0}
                                        >
                                            使用下方输入内容
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleWanqingModelComparison}
                                            disabled={isComparing || comparisonPrompt.trim().length === 0}
                                            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                                        >
                                            {isComparing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    生成中…
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4 text-amber-300" />
                                                    生成候选
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {comparisonResults.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                对比结果
                            </div>
                            <div className="space-y-2">
                                {comparisonResults.map((result, index) =>
                                    result.status === "ok" ? (
                                        <div
                                            key={`${result.id}-${index}`}
                                            className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {result.label}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {result.summary || "模型已返回候选布局。"}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectComparisonResult(result)}
                                                        className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        选择并继续
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePreviewComparisonResult(result)}
                                                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
                                                    >
                                                        预览
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={`${result.id}-${index}-error`}
                                            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                                        >
                                            {result.label}：{result.error ?? "生成失败"}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {showSessionStatus && (
                    <SessionStatus
                        status={status}
                        providerLabel={providerLabel}
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

                <DiagramTimelineRail
                    history={diagramHistory}
                    activeIndex={activeVersionIndex}
                    onSelect={restoreDiagramAt}
                    onShowHistory={() => setShowHistory(true)}
                />

                <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-100 bg-white/90 px-2">
                    <ChatMessageDisplay
                        messages={messages}
                        error={error}
                        setInput={setInput}
                        setFiles={handleFileChange}
                    />
                </div>
            </CardContent>

            <CardFooter className="shrink-0 border-t bg-background p-3">
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
                />
            </CardFooter>

            {!activeToolPanel && (
                <div className="pointer-events-none absolute bottom-28 right-4 z-20">
                    <button
                        type="button"
                        onClick={() => toggleToolPanel(lastToolPanel)}
                        className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-slate-900"
                    >
                        <Settings className="h-3.5 w-3.5 text-white" />
                        打开{floatingLabel}
                    </button>
                </div>
            )}
        </Card>
    );
}
