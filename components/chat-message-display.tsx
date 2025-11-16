"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import { svgToDataUrl } from "@/lib/svg";
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
    activeBranchId?: string;
    onOpenBriefPanel?: () => void;
    briefBadges?: string[];
    briefSummary?: string;
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
    activeBranchId,
    onOpenBriefPanel,
    briefBadges,
    briefSummary,
}: ChatMessageDisplayProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processedToolCalls = useRef<Set<string>>(new Set());
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
    const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
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

    const leadingComparisons = useMemo(
        () => comparisonHistory.filter((entry) => !entry.anchorMessageId),
        [comparisonHistory]
    );

    const anchoredComparisons = useMemo(() => {
        const map = new Map<string, ComparisonHistoryEntry[]>();
        comparisonHistory.forEach((entry) => {
            if (!entry.anchorMessageId) {
                return;
            }
            const bucket = map.get(entry.anchorMessageId) ?? [];
            bucket.push(entry);
            map.set(entry.anchorMessageId, bucket);
        });
        return map;
    }, [comparisonHistory]);

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

        const renderInputContent = () => {
            if (!input || !isExpanded) {
                return null;
            }
            if (toolName === "display_diagram" && typeof input?.xml === "string") {
                return (
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            输入 · XML
                        </div>
                        <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-slate-600">
                            {input.xml}
                        </pre>
                    </div>
                );
            }
            if (
                toolName === "edit_diagram" &&
                Array.isArray(input?.edits) &&
                input.edits.length > 0
            ) {
                return (
                    <div className="mt-1 flex max-h-80 flex-col gap-2 overflow-auto pr-1">
                        {input.edits.map((edit: any, index: number) => (
                            <div
                                key={`${callId}-edit-${index}`}
                                className="rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5"
                            >
                                <div className="text-[10px] font-semibold text-slate-600">
                                    编辑 #{index + 1}
                                </div>
                                {edit.search ? (
                                    <div className="mt-1">
                                        <div className="text-[10px] uppercase text-slate-500">
                                            Search
                                        </div>
                                        <pre className="mt-0.5 whitespace-pre-wrap break-all font-mono text-[10px] text-slate-600">
                                            {edit.search}
                                        </pre>
                                    </div>
                                ) : null}
                                {edit.replace ? (
                                    <div className="mt-1">
                                        <div className="text-[10px] uppercase text-slate-500">
                                            Replace
                                        </div>
                                        <pre className="mt-0.5 whitespace-pre-wrap break-all font-mono text-[10px] text-slate-600">
                                            {edit.replace}
                                        </pre>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                );
            }
            const serialized =
                typeof input === "string"
                    ? input
                    : JSON.stringify(input, null, 2);
            return (
                <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-slate-500">
                    输入：{serialized}
                </pre>
            );
        };

        return (
            <div
                key={callId}
                className="my-2 w-full max-w-[min(720px,90%)] rounded-lg  bg-white/95 px-3 py-2.5 text-xs leading-relaxed text-slate-600"
            >
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <div className="text-[11px] font-medium text-slate-700">工具：{toolName}</div>
                        {input && Object.keys(input).length > 0 && (
                            <button
                                onClick={toggleExpanded}
                                className="text-[11px] text-slate-500 transition hover:text-slate-700"
                            >
                                {isExpanded ? "隐藏参数" : "显示参数"}
                            </button>
                        )}
                    </div>
                    {renderInputContent()}
                    <div className="mt-1.5 text-xs">
                        {state === "input-streaming" ? (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                        ) : state === "output-available" ? (
                            <div className="text-emerald-600">
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
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                        <div className="mb-1 text-[11px] font-semibold text-slate-600">
                            执行状态：{state}
                        </div>
                        {output && (
                            <div className="text-[11px] text-slate-700 whitespace-pre-wrap break-words">
                                {typeof output === "string"
                                    ? output
                                    : JSON.stringify(output, null, 2)}
                            </div>
                        )}
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
        const hasSuccessfulResults = entry.results.some(result => result.status === "ok");
        const isWaitingForSelection = !isEntryLoading && hasSuccessfulResults && !entry.adoptedResultId;
        
        // 找到成功的结果用于切换
        const successfulResults = entry.results.filter(result => result.status === "ok" && result.branchId);
        const currentResultIndex = successfulResults.findIndex(result => result.id === entry.adoptedResultId);
        const hasMultipleOptions = successfulResults.length > 1;
        const showSwitcher = !isWaitingForSelection && hasMultipleOptions && currentResultIndex >= 0;

        return (
            <div key={`${keyBase}-comparison`} className="mt-2 w-full">
                <div className="w-full rounded-lg bg-white/80 border border-slate-200/60 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                模型对比
                            </div>
                            {formattedDate && (
                                <div className="text-[10px] text-slate-400">
                                    {formattedDate}
                                </div>
                            )}
                            {isEntryLoading && (
                                <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400"/>
                                    正在生成…
                                </div>
                            )}
                        </div>
                        {showSwitcher && (
                            <div className="flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200 px-2 py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const prevIndex = (currentResultIndex - 1 + successfulResults.length) % successfulResults.length;
                                        onComparisonApply?.(successfulResults[prevIndex]);
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200 transition"
                                    aria-label="切换到上一个结果"
                                >
                                    <svg className="h-3.5 w-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="text-[11px] font-medium text-slate-600 min-w-[32px] text-center">
                                    {currentResultIndex + 1}/{successfulResults.length}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextIndex = (currentResultIndex + 1) % successfulResults.length;
                                        onComparisonApply?.(successfulResults[nextIndex]);
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200 transition"
                                    aria-label="切换到下一个结果"
                                >
                                    <svg className="h-3.5 w-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {isWaitingForSelection && (
                        <div className="mb-3 rounded-md bg-amber-50/80 px-3 py-2 text-sm border border-amber-200/40">
                            <div className="flex items-start gap-2">
                                <svg className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <div className="font-medium text-amber-900 text-xs">
                                        请选择一个结果继续
                                    </div>
                                    <div className="text-amber-700 text-[11px] mt-0.5">
                                        点击卡片「设为画布」，选择后可用右上角切换器在结果间切换
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* 横向滚动容器 */}
                    <div className="w-full overflow-x-auto">
                        <div 
                            className="flex gap-3 pb-2"
                            style={{
                                width: `${entry.results.length * 360 + (entry.results.length - 1) * 12}px`,
                                overflowX: 'auto',
                                scrollBehavior: 'smooth',
                            }}
                        >
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
                            const previewSvgSrc = svgToDataUrl(result.previewSvg);
                            const previewImageSrc = result.previewImage?.trim()?.length
                                ? result.previewImage
                                : null;
                            const hasPreview =
                                result.status === "ok" &&
                                (Boolean(previewSvgSrc) ||
                                    Boolean(previewImageSrc) ||
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
                            const isAdopted = entry.adoptedResultId === result.id;
                            const isActiveBranch =
                                activeBranchId && result.branchId === activeBranchId;
                            const badgeLabel = isActiveBranch
                                ? "使用中"
                                : null;

                            return (
                                <div
                                    key={cardKey}
                                    className={cn(
                                        "group relative flex flex-col rounded-lg overflow-hidden transition-all duration-200 border flex-shrink-0",
                                        result.status === "ok"
                                            ? "bg-white border-slate-200/60"
                                            : result.status === "loading"
                                                ? "bg-slate-50 border-slate-200/40"
                                                : "bg-red-50/50 border-red-200/40",
                                        isActive && "ring-1 ring-blue-400"
                                    )}
                                    style={{ width: '360px', height: '260px' }}
                                >
                                    {/* 预览图区域 */}
                                    <div className="relative bg-slate-50/30" style={{ height: '220px' }}>
                                        <div 
                                            role={result.status === "ok" ? "button" : undefined}
                                            tabIndex={result.status === "ok" ? 0 : -1}
                                            onClick={() =>
                                                result.status === "ok" &&
                                                onComparisonPreview?.(entry.requestId, result)
                                            }
                                            className={cn(
                                                "flex h-full w-full justify-center items-center overflow-hidden p-2",
                                                result.status === "ok" && "cursor-pointer"
                                            )}
                                        >
                                            {result.status === "ok" ? (
                                                hasPreview ? (
                                                    <>
                                                        {previewSvgSrc ? (
                                                            <div className="relative h-full w-full">
                                                                <Image
                                                                    src={previewSvgSrc}
                                                                    alt={`comparison-preview-svg-${cardKey}`}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 768px) 100vw, 360px"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                        ) : previewImageSrc ? (
                                                            <div className="relative h-full w-full">
                                                                <Image
                                                                    src={previewImageSrc}
                                                                    alt={`comparison-preview-${cardKey}`}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 768px) 100vw, 360px"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                        ) : previewUrl ? (
                                                            <iframe
                                                                src={previewUrl}
                                                                title={`diagram-preview-${cardKey}`}
                                                                className="h-full w-full border-0"
                                                                loading="lazy"
                                                                allowFullScreen
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                                                暂无预览
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                                        暂无预览
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                                    {result.status === "loading"
                                                        ? "正在生成…"
                                                        : "生成失败"}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* 左上角标签 */}
                                        <div className="absolute left-2 top-2">
                                            <span className="inline-flex items-center rounded-md bg-white/90 backdrop-blur-sm border border-slate-200/50 px-2 py-1 text-[11px] font-medium text-slate-700">
                                                {result.slot === "A" ? "模型 A" : "模型 B"}
                                            </span>
                                        </div>
                                        
                                        {/* 右上角使用中标签 */}
                                        {badgeLabel && (
                                            <div className="absolute right-2 top-2">
                                                <span className="inline-flex items-center rounded-md bg-blue-500 px-2 py-1 text-[11px] font-medium text-white">
                                                    ✓ {badgeLabel}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Hover 遮罩层和按钮 */}
                                        {result.status === "ok" && (
                                            <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-gradient-to-t from-slate-900/70 via-slate-900/30 to-transparent opacity-0 transition-opacity duration-200 sm:flex sm:group-hover:opacity-100">
                                                <div className="pointer-events-auto flex gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-8 rounded-md px-3 text-xs font-medium bg-white/95 hover:bg-white"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onComparisonPreview?.(
                                                                entry.requestId,
                                                                result
                                                            );
                                                        }}
                                                    >
                                                        预览
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-8 rounded-md bg-blue-500 px-3 text-xs font-medium text-white hover:bg-blue-600"
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
                                    
                                    {/* 底部信息区 */}
                                    <div className="px-3 py-2 bg-white border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-medium text-slate-900 truncate">
                                                {result.label || result.modelId}
                                            </div>
                                            {result.status === "ok" && (
                                                <div className="flex gap-1.5 sm:hidden">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 rounded-md px-2 text-[11px]"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onComparisonPreview?.(
                                                                entry.requestId,
                                                                result
                                                            );
                                                        }}
                                                    >
                                                        预览
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-6 rounded-md bg-blue-500 px-2 text-[11px] text-white hover:bg-blue-600"
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
                                        </div>
                                    </div>
                                    
                                    {/* 错误状态 */}
                                    {result.status === "error" && (
                                        <div className="px-3 py-2 bg-red-50 border-t border-red-100">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="text-[11px] text-red-700 leading-relaxed">
                                                    {result.error ?? "调用模型失败，请稍后重试或调整提示词。"}
                                                </div>
                                                {onComparisonRetry && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 w-fit rounded-md px-2 text-[11px] font-medium border-red-200 text-red-700 hover:bg-red-100"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onComparisonRetry(entry, result);
                                                        }}
                                                    >
                                                        重新生成
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* 加载状态 */}
                                    {result.status === "loading" && (
                                        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <div className="h-2.5 w-2.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
                                                正在生成…
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
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
                .filter(
                    (part: any) =>
                        part.type === "text" &&
                        (typeof part.text === "string" || typeof part.displayText === "string")
                )
                .map(
                    (part: any) =>
                        (typeof part.displayText === "string" && part.displayText.length > 0
                            ? part.displayText
                            : part.text) ?? ""
                )
                .join("\n")
                .trim();
        }
        return "";
    };

    // 复制消息内容
    const handleCopyMessage = async (messageId: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // 切换消息展开/折叠
    const toggleMessageExpanded = (messageId: string) => {
        setExpandedMessages(prev => ({
            ...prev,
            [messageId]: !prev[messageId]
        }));
    };

    const renderedAnchors = new Set<string>();
    const showExamplePanel = (
        messages.length === 0 &&
        leadingComparisons.length === 0 &&
        comparisonHistory.length === 0
    );

    return (
        <div className="h-full overflow-y-auto pr-4">
            {showExamplePanel ? (
                <div className="py-2">
                    <ExamplePanel
                        setInput={setInput}
                        setFiles={setFiles}
                        onOpenBriefPanel={onOpenBriefPanel}
                        briefBadges={briefBadges}
                        briefSummary={briefSummary}
                    />
                </div>
            ) : (
                <>
                    {leadingComparisons.map((entry, index) => (
                        <div
                            key={`comparison-leading-${index}`}
                            className="mb-5 text-left"
                        >
                            {renderComparisonEntry(entry, `comparison-leading-${index}`)}
                        </div>
                    ))}
                    {messages.map((message) => {
                        const isUser = message.role === "user";
                        const parts = Array.isArray(message.parts) ? message.parts : [];
                        const toolParts = parts.filter((part: any) =>
                            part.type?.startsWith("tool-")
                        );
                        const contentParts = parts.filter(
                            (part: any) => !part.type?.startsWith("tool-")
                        );
                        const fallbackText =
                            contentParts.length === 0 ? resolveMessageText(message) : "";
                        const hasBubbleContent =
                            contentParts.length > 0 || fallbackText.length > 0;
                        const anchoredEntries =
                            anchoredComparisons.get(message.id) ?? [];
                        if (anchoredEntries.length > 0) {
                            renderedAnchors.add(message.id);
                        }

                        // 获取完整消息文本用于折叠检测和复制
                        const fullMessageText = resolveMessageText(message);
                        const messageLength = fullMessageText.length;
                        const shouldCollapse = messageLength > 500; // 超过500字符自动折叠
                        const isExpanded = expandedMessages[message.id] ?? !shouldCollapse;
                        const isCopied = copiedMessageId === message.id;

                        return (
                            <div key={message.id} className="mb-5 flex flex-col gap-2">
                                {hasBubbleContent && (
                                    <div
                                        className={cn(
                                            "flex w-full",
                                            isUser ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className="relative max-w-[min(720px,90%)] group">
                                            <div
                                                className={cn(
                                                    "rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                                                    "whitespace-pre-wrap break-words",
                                                    isUser
                                                        ? "bg-slate-900 text-white"
                                                        : "border border-slate-200/60 bg-white text-slate-900",
                                                    !isExpanded && "max-h-[200px] overflow-hidden relative"
                                                )}
                                            >
                                                {contentParts.map((part: any, index: number) => {
                                                    switch (part.type) {
                                                        case "text":
                                                            const textToShow =
                                                                part.displayText ?? part.text ?? "";
                                                            return (
                                                                <div key={index} className="mb-1 last:mb-0">
                                                                    {textToShow}
                                                                </div>
                                                            );
                                                        case "file":
                                                            return (
                                                                <div key={index} className="mt-3">
                                                                    <Image
                                                                        src={part.url}
                                                                        width={240}
                                                                        height={240}
                                                                        alt={`file-${index}`}
                                                                        className="rounded-xl border object-contain"
                                                                    />
                                                                </div>
                                                            );
                                                        default:
                                                            return null;
                                                    }
                                                })}
                                                {!contentParts.length && fallbackText && (
                                                    <div>{fallbackText}</div>
                                                )}
                                                {/* 折叠渐变遮罩 */}
                                                {!isExpanded && (
                                                    <div 
                                                        className={cn(
                                                            "absolute bottom-0 left-0 right-0 h-20 pointer-events-none",
                                                            isUser 
                                                                ? "bg-gradient-to-t from-slate-900 to-transparent" 
                                                                : "bg-gradient-to-t from-white to-transparent"
                                                        )}
                                                    />
                                                )}
                                            </div>
                                            
                                            {/* 操作按钮栏 */}
                                            <div className={cn(
                                                "flex items-center gap-1.5 mt-1.5",
                                                isUser ? "justify-end" : "justify-start"
                                            )}>
                                                {/* 复制按钮 */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyMessage(message.id, fullMessageText)}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                                                        isUser 
                                                            ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50" 
                                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
                                                        isCopied && "text-emerald-600"
                                                    )}
                                                    title="复制消息"
                                                >
                                                    {isCopied ? (
                                                        <>
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <span>已复制</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            <span>复制</span>
                                                        </>
                                                    )}
                                                </button>
                                                
                                                {/* 展开/折叠按钮 */}
                                                {shouldCollapse && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMessageExpanded(message.id)}
                                                        className={cn(
                                                            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                                                            isUser 
                                                                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50" 
                                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                        )}
                                                    >
                                                        {isExpanded ? (
                                                            <>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                </svg>
                                                                <span>收起</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                                <span>展开</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {toolParts.map((part: any) => (
                                    <div
                                        key={part.toolCallId}
                                        className={cn(
                                            "flex w-full",
                                            isUser ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {renderToolPart(part)}
                                    </div>
                                ))}
                                {isUser && onMessageRevert ? (
                                    <div className="flex w-full justify-end">
                                        <button
                                            type="button"
                                            className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
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
                                {anchoredEntries.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-3">
                                        {anchoredEntries.map((entry, index) =>
                                            renderComparisonEntry(
                                                entry,
                                                `comparison-anchored-${entry.requestId}-${index}`
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {Array.from(anchoredComparisons.entries())
                        .filter(([anchorId]) => !renderedAnchors.has(anchorId))
                        .flatMap(([, entries]) => entries)
                        .map((entry, index) => (
                            <div
                                key={`comparison-orphan-${entry.requestId}-${index}`}
                                className="mb-5 text-left"
                            >
                                {renderComparisonEntry(
                                    entry,
                                    `comparison-orphan-${entry.requestId}-${index}`
                                )}
                            </div>
                        ))}
                </>
            )}
            {error && (
                <div className="text-red-500 text-sm mt-2">
                    错误：{error.message}
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
