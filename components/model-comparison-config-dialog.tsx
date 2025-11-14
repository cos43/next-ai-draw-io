import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/model-selector";
import { cn } from "@/lib/utils";
import { ArrowUpDown, RefreshCcw, Sparkles } from "lucide-react";
import type { RuntimeModelOption } from "@/types/model-config";

export interface ComparisonModelConfig {
    primary: string;
    secondary: string;
}

interface ModelComparisonConfigDialogProps {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    config: ComparisonModelConfig;
    onConfigChange: (next: ComparisonModelConfig) => void;
    defaultPrimaryKey?: string;
    models: RuntimeModelOption[];
    onManageModels?: () => void;
}

export function ModelComparisonConfigDialog({
    open,
    onOpenChange,
    config,
    onConfigChange,
    defaultPrimaryKey,
    models,
    onManageModels,
}: ModelComparisonConfigDialogProps) {
    const lookupModel = (key?: string) =>
        models.find((model) => model.key === key);

    const handleSyncPrimary = () => {
        if (!defaultPrimaryKey) return;
        onConfigChange({
            primary: defaultPrimaryKey,
            secondary: config.secondary,
        });
    };

    const handleSyncBoth = () => {
        if (!defaultPrimaryKey) return;
        onConfigChange({
            primary: defaultPrimaryKey,
            secondary: defaultPrimaryKey,
        });
    };

    const handleSwap = () => {
        onConfigChange({
            primary: config.secondary,
            secondary: config.primary,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        配置对比模型
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        选择任意两个已配置的模型（也可以是同一个模型的不同版本）。FlowPilot 会将同一条提示词同步发送给双方，用于对比风格和布局差异。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                        <div className="text-xs text-slate-500">
                            当前对话模型：
                            <span className="ml-1 font-mono text-slate-700">
                                {lookupModel(defaultPrimaryKey)?.label ??
                                    "未选择"}
                            </span>
                    </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                onClick={handleSyncPrimary}
                                disabled={!defaultPrimaryKey}
                            >
                                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                                同步模型 A
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                onClick={handleSyncBoth}
                                disabled={!defaultPrimaryKey}
                            >
                                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                双方同步
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                    模型 A
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    推荐设为当前聊天所使用的模型
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-800"
                                onClick={handleSwap}
                                title="交换模型 A / B"
                            >
                                <ArrowUpDown className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="mt-3">
                            <ModelSelector
                                selectedModelKey={config.primary}
                                onModelChange={(id) =>
                                    onConfigChange({
                                        primary: id,
                                        secondary: config.secondary,
                                    })
                                }
                                models={models}
                                onManage={onManageModels}
                            />
                        </div>
                    </div>

                    <div className={cn(
                        "rounded-2xl border p-4 shadow-sm",
                        config.secondary === config.primary
                            ? "border-slate-200 bg-white/80"
                            : "border-blue-200 bg-blue-50/80"
                    )}>
                        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                            模型 B
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            可选择另一个模型或版本，方便观察输出差异。
                        </p>
                        <div className="mt-3">
                            <ModelSelector
                                selectedModelKey={config.secondary}
                                onModelChange={(id) =>
                                    onConfigChange({
                                        primary: config.primary,
                                        secondary: id,
                                    })
                                }
                                models={models}
                                onManage={onManageModels}
                            />
                        </div>
                        {config.secondary === config.primary ? (
                            <div className="mt-3 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-xs text-slate-500">
                                当前选择为相同模型，适合测试同模型不同温度策略或稳定性。
                            </div>
                        ) : (
                            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                模型已不同：对比时 FlowPilot 会展示各自摘要与 XML 长度，便于你挑选更优方案。
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        type="button"
                        variant="default"
                        className="ml-auto h-9 rounded-full bg-slate-900 px-6 text-xs font-semibold text-white hover:bg-slate-900/90"
                        onClick={() => onOpenChange(false)}
                    >
                        完成
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
