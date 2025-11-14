"use client";

import type React from "react";
import {useRef, useEffect, useState} from "react";
import Image from "next/image";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import ExamplePanel from "./chat-example-panel";
import {UIMessage} from "ai";
import {
    ComparisonCardResult,
    ComparisonHistoryEntry,
} from "@/types/comparison";

interface ChatMessageDisplayProps {
    messages: UIMessage[];
    error?: Error | null;
    setInput: (input: string) => void;
    setFiles: (files: File[]) => void;
    onDisplayDiagram?: (xml: string, meta: { toolCallId?: string }) => void;
    onComparisonApply?: (result: ComparisonCardResult) => void;
    onComparisonCopyXml?: (xml: string) => void;
    onComparisonDownload?: (result: ComparisonCardResult) => void;
    onComparisonPreview?: (requestId: string, result: ComparisonCardResult) => void;
    buildComparisonPreviewUrl?: (xml: string) => string | null;
    onComparisonRetry?: (
        entry: ComparisonHistoryEntry,
        result: ComparisonCardResult
    ) => void;
    comparisonHistory?: ComparisonHistoryEntry[];
    activePreview?: { requestId: string; resultId: string } | null;
    onMessageRevert?: (payload: { messageId: string; text: string }) => void;
}

export function ChatMessageDisplay({
                                       messages,
                                       error,
                                       setInput,
                                       setFiles,
                                       onDisplayDiagram,
                                       onComparisonApply,
                                       onComparisonCopyXml,
                                       onComparisonDownload,
                                       onComparisonPreview,
                                       buildComparisonPreviewUrl,
                                       onComparisonRetry,
                                       comparisonHistory = [],
                                       activePreview = null,
                                       onMessageRevert,
                                   }: ChatMessageDisplayProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processedToolCalls = useRef<Set<string>>(new Set());
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>(
        {}
    );
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [messages]);

    // Handle tool invocations and update diagram when needed
    useEffect(() => {
        messages.forEach((message) => {
            if (message.parts) {
                message.parts.forEach((part: any) => {
                    if (part.type?.startsWith("tool-")) {
                        const {toolCallId, state} = part;

                        // Auto-collapse args when diagrams are generated
                        if (state === "output-available") {
                            setExpandedTools((prev) => ({
                                ...prev,
                                [toolCallId]: false,
                            }));
                        }

                        // Handle diagram updates for display_diagram tool
                        if (
                            part.type === "tool-display_diagram" &&
                            part.input?.xml &&
                            typeof onDisplayDiagram === "function" &&
                            state === "output-available" &&
                            !processedToolCalls.current.has(toolCallId)
                        ) {
                            onDisplayDiagram(part.input.xml, {toolCallId});
                            processedToolCalls.current.add(toolCallId);
                        }
                    }
                });
            }
        });
    }, [messages, onDisplayDiagram]);

    const renderToolPart = (part: any) => {
        const callId = part.toolCallId;
        const {state, input, output} = part;
        const isExpanded = expandedTools[callId] ?? true;
        const toolName = part.type?.replace("tool-", "");

        const toggleExpanded = () => {
            setExpandedTools((prev) => ({
                ...prev,
                [callId]: !isExpanded,
            }));
        };

        return (
            <div
                key={callId}
                className="p-4 my-2 text-gray-500 border border-gray-300 rounded"
            >
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="text-xs">工具：{toolName}</div>
                        {input && Object.keys(input).length > 0 && (
                            <button
                                onClick={toggleExpanded}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                {isExpanded ? "隐藏参数" : "显示参数"}
                            </button>
                        )}
                    </div>
                    {input && isExpanded && (
                        <div className="mt-1 font-mono text-xs overflow-hidden">
                            {typeof input === "object" &&
                                Object.keys(input).length > 0 &&
                                `输入：${JSON.stringify(input, null, 2)}`}
                        </div>
                    )}
                    <div className="mt-2 text-sm">
                        {state === "input-streaming" ? (
                            <div
                                className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                        ) : state === "output-available" ? (
                            <div className="text-green-600">
                                {output || (toolName === "display_diagram"
                                    ? "图表生成完成"
                                    : toolName === "edit_diagram"
                                        ? "图表编辑完成"
                                        : "工具执行完成")}
                            </div>
                        ) : state === "output-error" ? (
                            <div className="text-red-600">
                                {output || (toolName === "display_diagram"
                                    ? "生成图表时出错"
                                    : toolName === "edit_diagram"
                                        ? "编辑图表时出错"
                                        : "工具执行出错")}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    const renderComparisonEntry = (
        entry: ComparisonHistoryEntry,
        keyBase: string
    ) => {
        const formattedDate =
            entry.timestamp && !Number.isNaN(Date.parse(entry.timestamp))
                ? new Date(entry.timestamp).toLocaleString()
                : undefined;
        const isEntryLoading = entry.status === "loading";

        return (
            <div key={`${keyBase}-comparison`} className="mt-2 w-full">
                <div className="w-full rounded-3xl border border-slate-200 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                                FlowPilot · 模型对比
                            </div>
                            {formattedDate && (
                                <div className="text-[11px] text-slate-400">
                                    生成于 {formattedDate}
                                </div>
                            )}
                            {isEntryLoading && (
                                <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400"/>
                                    正在生成对比结果…
                                </div>
                            )}
                        </div>
                    </div>

                    {entry.prompt && (
                        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 transition">
                            <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                提示词
                            </summary>
                            <div className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-700">
                                {entry.prompt}
                            </div>
                        </details>
                    )}

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {entry.results.map((result, resultIndex) => {
                            const cardKey = `${keyBase}-${result.id ?? resultIndex}`;
                            const trimmedEncodedXml = result.encodedXml?.trim();
                            const trimmedXml = result.xml?.trim();
                            const rawXmlForPreview =
                                trimmedEncodedXml && trimmedEncodedXml.length > 0
                                    ? trimmedEncodedXml
                                    : trimmedXml && trimmedXml.length > 0
                                        ? trimmedXml
                                        : "";
                            const previewUrl =
                                result.status === "ok" &&
                                rawXmlForPreview &&
                                buildComparisonPreviewUrl
                                    ? buildComparisonPreviewUrl(rawXmlForPreview)
                                    : null;
                            const hasPreview =
                                result.status === "ok" &&
                                (Boolean(result.previewSvg?.trim()) ||
                                    Boolean(result.previewImage?.trim()) ||
                                    Boolean(previewUrl));
                            const isActive =
                                activePreview?.requestId === entry.requestId &&
                                activePreview?.resultId === result.id;
                            const statusLabel =
                                result.status === "ok"
                                    ? isActive
                                        ? "预览中"
                                        : "生成成功"
                                    : result.status === "loading"
                                        ? "正在生成"
                                        : "生成失败";
                            const statusClass =
                                result.status === "ok"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                    : result.status === "loading"
                                        ? "border-slate-200 bg-slate-100 text-slate-400"
                                        : "border-red-200 bg-red-50 text-red-600";

                            return (
                                <div
                                    key={cardKey}
                                    role={result.status === "ok" ? "button" : undefined}
                                    tabIndex={result.status === "ok" ? 0 : -1}
                                    onClick={() =>
                                        result.status === "ok" &&
                                        onComparisonPreview?.(entry.requestId, result)
                                    }
                                    className={cn(
                                        "group relative flex flex-col gap-3 rounded-3xl border bg-white/95 p-4 shadow-sm transition",
                                        result.status === "ok"
                                            ? "border-slate-200 hover:border-slate-300 hover:shadow"
                                            : result.status === "loading"
                                                ? "border-slate-200 bg-slate-50"
                                                : "border-red-200 bg-red-50/80",
                                        result.status === "ok" && "cursor-pointer",
                                        result.status !== "ok" && "cursor-default",
                                        isActive &&
                                        "border-emerald-400 ring-2 ring-emerald-200"
                                    )}
                                >
                                    <div
                                        className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50">
                                        <div className="flex h-[200px] w-full items-center justify-center overflow-hidden">
                                            {result.status === "ok" ? (
                                                hasPreview ? (
                                                    <>
                                                        {result.previewSvg?.trim()?.length ? (
                                                            <div
                                                                className="flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:object-contain"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: result.previewSvg,
                                                                }}
                                                            />
                                                        ) : result.previewImage?.trim()?.length ? (
                                                            <img
                                                                src={result.previewImage}
                                                                alt={`comparison-preview-${cardKey}`}
                                                                className="block h-full w-full object-contain"
                                                            />
                                                        ) : previewUrl ? (
                                                            <iframe
                                                                src={previewUrl}
                                                                title={`diagram-preview-${cardKey}`}
                                                                className="h-full w-full rounded-none border-0"
                                                                loading="lazy"
                                                                allowFullScreen
                                                            />
                                                        ) : (
                                                            <div
                                                                className="flex h-full items-center justify-center text-xs text-slate-400">
                                                                暂无预览
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div
                                                        className="flex h-full items-center justify-center text-xs text-slate-400">
                                                        暂无预览
                                                    </div>
                                                )
                                            ) : (
                                                <div
                                                    className="flex h-full items-center justify-center text-xs text-slate-400">
                                                    {result.status === "loading"
                                                        ? "正在生成…"
                                                        : "生成失败"}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute left-4 top-4">
                                            <span
                                                className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow">
                                                {result.slot === "A" ? "模型 A" : "模型 B"}
                                            </span>
                                        </div>
                                        {result.status === "ok" && (
                                            <div
                                                className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-slate-900/60 opacity-0 transition-opacity duration-200 sm:flex sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                <div
                                                    className="pointer-events-auto flex flex-wrap justify-center gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-8 rounded-full px-3 text-xs font-semibold"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onComparisonPreview?.(
                                                                entry.requestId,
                                                                result
                                                            );
                                                        }}
                                                    >
                                                        画布预览
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-8 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-900/90"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onComparisonApply?.(result);
                                                        }}
                                                        disabled={!result.xml}
                                                    >
                                                        设为画布
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {result.status === "ok" && (
                                        <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 rounded-full px-3 text-xs font-semibold"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onComparisonPreview?.(
                                                        entry.requestId,
                                                        result
                                                    );
                                                }}
                                            >
                                                画布预览
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-8 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-900/90"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onComparisonApply?.(result);
                                                }}
                                                disabled={!result.xml}
                                            >
                                                设为画布
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3 px-1">
                                        <div className="min-w-0 text-sm font-semibold text-slate-900">
                                            <span className="block truncate">
                                                {result.label || result.modelId}
                                            </span>
                                        </div>
                                    </div>
                                    {result.status === "error" && (
                                        <div className="flex flex-col gap-2 px-1 pb-1">
                                            <div
                                                className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-600">
                                                {result.error ??
                                                    "调用模型失败，请稍后重试或调整提示词。"}
                                            </div>
                                            {onComparisonRetry && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-fit rounded-full px-3 text-xs font-semibold text-slate-600"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onComparisonRetry(entry, result);
                                                    }}
                                                >
                                                    重新生成
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {result.status === "loading" && (
                                        <div className="px-1 pb-1 text-xs text-slate-400">
                                            正在生成…
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const resolveMessageText = (message: UIMessage): string => {
        if (typeof (message as any).content === "string") {
            return (message as any).content;
        }
        if (Array.isArray((message as any).parts)) {
            return (message as any).parts
                .filter((part: any) => part.type === "text" && typeof part.text === "string")
                .map((part: any) => part.text)
                .join("\n")
                .trim();
        }
        return "";
    };

    return (
        <ScrollArea className="h-full pr-4">
            {messages.length === 0 ? (
                <div className="py-2">
                    <ExamplePanel setInput={setInput} setFiles={setFiles}/>
                </div>
            ) : (
                messages.map((message) => (
                    <div
                        key={message.id}
                        className={`mb-4 ${
                            message.role === "user" ? "text-right" : "text-left"
                        }`}
                    >
                        <div
                            className={cn(
                                "inline-block max-w-[85%] break-words rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                                message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {message.parts?.map((part: any, index: number) => {
                                switch (part.type) {
                                    case "text":
                                        return (
                                            <div key={index}>{part.text}</div>
                                        );
                                    case "file":
                                        return (
                                            <div key={index} className="mt-2">
                                                <Image
                                                    src={part.url}
                                                    width={200}
                                                    height={200}
                                                    alt={`file-${index}`}
                                                    className="rounded-md border"
                                                    style={{
                                                        objectFit: "contain",
                                                    }}
                                                />
                                            </div>
                                        );
                                    default:
                                        if (part.type?.startsWith("tool-")) {
                                            return renderToolPart(part);
                                        }
                                        return null;
                                }
                            })}
                        </div>
                        {message.role === "user" && onMessageRevert ? (
                            <div className="mt-1 inline-flex items-center justify-end gap-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                <button
                                    type="button"
                                    className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                                    onClick={() =>
                                        onMessageRevert({
                                            messageId: message.id,
                                            text: resolveMessageText(message),
                                        })
                                    }
                                >
                                    revert
                                </button>
                            </div>
                        ) : null}
                    </div>
                ))
            )}
            {comparisonHistory.map((entry, index) => (
                <div
                    key={`comparison-history-${index}`}
                    className="mb-4 text-left w-full"
                >
                    {renderComparisonEntry(entry, `comparison-${index}`)}
                </div>
            ))}
            {error && (
                <div className="text-red-500 text-sm mt-2">
                    错误：{error.message}
                </div>
            )}
            <div ref={messagesEndRef}/>
        </ScrollArea>
    );
}
