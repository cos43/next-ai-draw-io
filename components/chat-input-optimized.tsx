"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResetWarningModal } from "@/components/reset-warning-modal";
import {
    Loader2,
    Send,
    RotateCcw,
    Image as ImageIcon,
    History,
    MoreHorizontal,
} from "lucide-react";
import { ButtonWithTooltip } from "@/components/button-with-tooltip";
import { FilePreviewList } from "./file-preview-list";
import { useDiagram } from "@/contexts/diagram-context";
import { HistoryDialog } from "@/components/history-dialog";
import { cn } from "@/lib/utils";

interface ChatInputOptimizedProps {
    input: string;
    status: "submitted" | "streaming" | "ready" | "error";
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onClearChat: () => void;
    files?: File[];
    onFileChange?: (files: File[]) => void;
    showHistory?: boolean;
    onToggleHistory?: (show: boolean) => void;
    isCompactMode?: boolean;
}

export function ChatInputOptimized({
    input,
    status,
    onSubmit,
    onChange,
    onClearChat,
    files = [],
    onFileChange = () => {},
    showHistory = false,
    onToggleHistory = () => {},
    isCompactMode = false,
}: ChatInputOptimizedProps) {
    const { diagramHistory } = useDiagram();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showToolMenu, setShowToolMenu] = useState(false);

    // Auto-resize textarea based on content
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    // Handle keyboard shortcuts and paste events
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            const form = e.currentTarget.closest("form");
            if (form && input.trim() && status !== "streaming") {
                form.requestSubmit();
            }
        }
    };

    // Handle clipboard paste
    const handlePaste = async (e: React.ClipboardEvent) => {
        if (status === "streaming") return;

        const items = e.clipboardData.items;
        const imageItems = Array.from(items).filter((item) =>
            item.type.startsWith("image/")
        );

        if (imageItems.length > 0) {
            const imageFiles = await Promise.all(
                imageItems.map(async (item) => {
                    const file = item.getAsFile();
                    if (!file) return null;
                    // Create a new file with a unique name
                    return new File(
                        [file],
                        `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
                        {
                            type: file.type,
                        }
                    );
                })
            );

            const validFiles = imageFiles.filter(
                (file): file is File => file !== null
            );
            if (validFiles.length > 0) {
                onFileChange([...files, ...validFiles]);
            }
        }
    };

    // Handle file changes
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        onFileChange([...files, ...newFiles]);
    };

    // Remove individual file
    const handleRemoveFile = (fileToRemove: File) => {
        onFileChange(files.filter((file) => file !== fileToRemove));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Trigger file input click
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Handle drag events
    const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (status === "streaming") return;

        const droppedFiles = e.dataTransfer.files;

        // Only process image files
        const imageFiles = Array.from(droppedFiles).filter((file) =>
            file.type.startsWith("image/")
        );

        if (imageFiles.length > 0) {
            onFileChange([...files, ...imageFiles]);
        }
    };

    // Handle clearing conversation and diagram
    const handleClear = () => {
        onClearChat();
        setShowClearDialog(false);
    };

    return (
        <form
            onSubmit={onSubmit}
            className={`w-full space-y-2 ${
                isDragging
                    ? "border-2 border-dashed border-primary p-4 rounded-lg bg-muted/20"
                    : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <FilePreviewList files={files} onRemoveFile={handleRemoveFile} />

            <Textarea
                ref={textareaRef}
                value={input}
                onChange={onChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`描述你想对图表做的修改，或上传/粘贴图片来复刻示例。
（按下 Cmd/Ctrl + Enter 快速发送）`}
                disabled={status === "streaming"}
                aria-label="聊天输入框"
                className="min-h-[80px] resize-none transition-all duration-200 px-1 py-0"
            />

            <div className="flex items-center justify-between">
                {/* 左侧：清空按钮和工具菜单 */}
                <div className="flex items-center gap-1">
                    {isCompactMode ? (
                        // 紧凑模式：使用更多按钮
                        <div className="relative">
                            <ButtonWithTooltip
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowToolMenu(!showToolMenu)}
                                tooltipContent="显示更多工具"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </ButtonWithTooltip>
                            {showToolMenu && (
                                <div className="absolute bottom-full left-0 mb-2 rounded-lg border bg-white shadow-lg p-1 z-10">
                                    <div className="flex flex-col gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowClearDialog(true);
                                                setShowToolMenu(false);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                                            disabled={status === "streaming"}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            清空对话
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onToggleHistory(true);
                                                setShowToolMenu(false);
                                            }}
                                            disabled={
                                                status === "streaming" ||
                                                diagramHistory.length === 0
                                            }
                                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            <History className="h-4 w-4" />
                                            图表历史
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                triggerFileInput();
                                                setShowToolMenu(false);
                                            }}
                                            disabled={status === "streaming"}
                                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            <ImageIcon className="h-4 w-4" />
                                            上传图片
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // 正常模式：显示所有按钮
                        <>
                            <ButtonWithTooltip
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowClearDialog(true)}
                                tooltipContent="清空当前对话与图表"
                                disabled={status === "streaming"}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </ButtonWithTooltip>

                            <ButtonWithTooltip
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleHistory(true)}
                                disabled={
                                    status === "streaming" ||
                                    diagramHistory.length === 0
                                }
                                tooltipContent="查看图表变更记录"
                            >
                                <History className="h-4 w-4" />
                            </ButtonWithTooltip>

                            <ButtonWithTooltip
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={triggerFileInput}
                                disabled={status === "streaming"}
                                tooltipContent="上传图片"
                            >
                                <ImageIcon className="h-4 w-4" />
                            </ButtonWithTooltip>
                        </>
                    )}
                </div>

                {/* 右侧：发送按钮 */}
                <Button
                    type="submit"
                    disabled={status === "streaming" || !input.trim()}
                    className="transition-opacity"
                    size="sm"
                    aria-label={
                        status === "streaming"
                            ? "正在发送消息…"
                            : "发送消息"
                    }
                >
                    {status === "streaming" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="mr-2 h-4 w-4" />
                    )}
                    发送
                </Button>
            </div>

            {/* 隐藏的文件输入 */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
                multiple
                disabled={status === "streaming"}
            />

            {/* 警告对话框 */}
            <ResetWarningModal
                open={showClearDialog}
                onOpenChange={setShowClearDialog}
                onClear={handleClear}
            />

            {/* 历史对话框 */}
            <HistoryDialog
                showHistory={showHistory}
                onToggleHistory={onToggleHistory}
            />
        </form>
    );
}
