"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface FilePreviewListProps {
    files: File[];
    onRemoveFile: (fileToRemove: File) => void;
}

export function FilePreviewList({ files, onRemoveFile }: FilePreviewListProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [previewMap, setPreviewMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const nextMap: Record<string, string> = {};
        const revokeQueue: string[] = [];
        files.forEach((file) => {
            if (file.type.startsWith("image/")) {
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                const objectUrl = URL.createObjectURL(file);
                nextMap[key] = objectUrl;
                revokeQueue.push(objectUrl);
            }
        });
        setPreviewMap(nextMap);
        return () => {
            revokeQueue.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [files]);

    const hasFiles = files.length > 0;

    return (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/40 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>参考图片</span>
                {!hasFiles && <span>拖拽或点击下方「上传图片」按钮即可添加</span>}
            </div>
            {hasFiles ? (
                <div className="flex flex-wrap gap-2">
                    {files.map((file, index) => {
                        const key = `${file.name}-${file.size}-${file.lastModified}`;
                        const imageUrl =
                            file.type.startsWith("image/") &&
                            previewMap[key]
                                ? previewMap[key]
                                : null;
                        return (
                            <div key={file.name + index} className="relative group">
                                <div
                                    className="w-20 h-20 border rounded-md overflow-hidden bg-muted cursor-pointer"
                                    onClick={() => imageUrl && setSelectedImage(imageUrl)}
                                >
                                    {imageUrl ? (
                                        <Image
                                            src={imageUrl}
                                            alt={file.name}
                                            width={80}
                                            height={80}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center p-1 text-center text-[11px] text-slate-600">
                                            {file.name}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveFile(file)}
                                    className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 opacity-0 transition-opacity group-hover:opacity-100"
                                    aria-label="移除文件"
                                >
                                    <X className="h-3 w-3 text-white" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-md border border-dashed border-slate-200 bg-white/60 p-3 text-xs text-slate-500">
                    尚未添加图片，可粘贴截图、拖入示例或点击上传按钮。
                </div>
            )}

            {/* Image Modal/Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors"
                        onClick={() => setSelectedImage(null)}
                        aria-label="关闭"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="relative w-auto h-auto max-w-[90vw] max-h-[90vh]">
                        <Image
                            src={selectedImage}
                            alt="预览"
                            width={1200}
                            height={900}
                            className="object-contain max-w-full max-h-[90vh] w-auto h-auto"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
