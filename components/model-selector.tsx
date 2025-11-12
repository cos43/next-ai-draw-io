"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ModelSelectorProps {
    selectedModelId: string;
    onModelChange: (modelId: string) => void;
    disabled?: boolean;
}

interface SavedModel {
    id: string;
    label?: string;
    lastUsed: number;
}

const STORAGE_KEY = "flowpilot-custom-models";

const DEFAULT_MODELS = [
    { id: "app-dbcwt0-1750310518239209222", label: "FlowPilot · 默认模型" },
];

export function ModelSelector({
    selectedModelId,
    onModelChange,
    disabled = false,
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customInput, setCustomInput] = useState("");
    const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 加载保存的模型
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setSavedModels(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved models:", e);
            }
        }
    }, []);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowCustomInput(false);
                setCustomInput("");
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 保存模型到本地存储
    const saveModel = (modelId: string, label?: string) => {
        const newModel: SavedModel = {
            id: modelId,
            label,
            lastUsed: Date.now(),
        };

        const updated = [
            newModel,
            ...savedModels.filter(m => m.id !== modelId)
        ].slice(0, 10); // 最多保存10个

        setSavedModels(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    // 删除保存的模型
    const deleteSavedModel = (modelId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = savedModels.filter(m => m.id !== modelId);
        setSavedModels(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    // 选择模型
    const selectModel = (modelId: string, label?: string) => {
        onModelChange(modelId);
        
        // 如果不是默认模型，保存到自定义模型列表
        if (!DEFAULT_MODELS.find(m => m.id === modelId)) {
            saveModel(modelId, label);
        }
        
        setIsOpen(false);
        setShowCustomInput(false);
        setCustomInput("");
    };

    // 添加自定义模型
    const addCustomModel = () => {
        if (customInput.trim()) {
            selectModel(customInput.trim());
        }
    };

    // 获取当前选中模型的显示名称
    const getSelectedModelLabel = () => {
        const defaultModel = DEFAULT_MODELS.find(m => m.id === selectedModelId);
        if (defaultModel) return defaultModel.label;
        
        const savedModel = savedModels.find(m => m.id === selectedModelId);
        if (savedModel?.label) return savedModel.label;
        
        return selectedModelId;
    };

    // 合并所有可用模型
    const allModels = [
        ...DEFAULT_MODELS,
        ...savedModels
            .filter(saved => !DEFAULT_MODELS.find(def => def.id === saved.id))
            .sort((a, b) => b.lastUsed - a.lastUsed)
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "h-8 px-3 justify-between font-normal text-xs",
                    "border-gray-200 hover:border-gray-300"
                )}
            >
                <span className="truncate max-w-[120px]">
                    {getSelectedModelLabel()}
                </span>
                <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1 max-h-80 overflow-y-auto">
                        {/* 默认模型 */}
                        <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b">
                            预设模型
                        </div>
                        {DEFAULT_MODELS.map((model) => (
                            <button
                                key={model.id}
                                type="button"
                                onClick={() => selectModel(model.id, model.label)}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between",
                                    selectedModelId === model.id && "bg-blue-50 text-blue-600"
                                )}
                            >
                                <span className="truncate">{model.label}</span>
                                {selectedModelId === model.id && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                        ))}

                        {/* 自定义模型 */}
                        {savedModels.length > 0 && (
                            <>
                                <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-t">
                                    自定义模型
                                </div>
                                {savedModels
                                    .filter(saved => !DEFAULT_MODELS.find(def => def.id === saved.id))
                                    .map((model) => (
                                        <div
                                            key={model.id}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between group cursor-pointer",
                                                selectedModelId === model.id && "bg-blue-50 text-blue-600"
                                            )}
                                        >
                                            <div 
                                                className="truncate flex-1 mr-2"
                                                onClick={() => selectModel(model.id, model.label)}
                                            >
                                                <div className="truncate">{model.label || model.id}</div>
                                                {model.label && (
                                                    <div className="text-xs text-gray-500 truncate">{model.id}</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {selectedModelId === model.id && <Check className="h-4 w-4" />}
                                                <button
                                                    type="button"
                                                    onClick={(e) => deleteSavedModel(model.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-600"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </>
                        )}

                        {/* 添加自定义模型 */}
                        <div className="border-t">
                            {showCustomInput ? (
                                <div className="p-3 space-y-2">
                                    <input
                                        type="text"
                                        placeholder="输入模型 ID (如: gpt-4, claude-3)"
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addCustomModel();
                                            } else if (e.key === "Escape") {
                                                setShowCustomInput(false);
                                                setCustomInput("");
                                            }
                                        }}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={addCustomModel}
                                            disabled={!customInput.trim()}
                                            className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            添加
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCustomInput(false);
                                                setCustomInput("");
                                            }}
                                            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowCustomInput(true)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                                >
                                    <Plus className="h-4 w-4" />
                                    添加自定义模型
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
