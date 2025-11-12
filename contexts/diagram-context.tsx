"use client";

import React, { createContext, useContext, useRef, useState } from "react";
import type { DrawIoEmbedRef } from "react-drawio";
import { extractDiagramXML } from "../lib/utils";

interface DiagramContextType {
    chartXML: string;
    latestSvg: string;
    diagramHistory: { svg: string; xml: string }[];
    activeVersionIndex: number;
    loadDiagram: (chart: string) => void;
    handleExport: () => void;
    resolverRef: React.Ref<((value: string) => void) | null>;
    drawioRef: React.Ref<DrawIoEmbedRef | null>;
    handleDiagramExport: (data: any) => void;
    clearDiagram: () => void;
    restoreDiagramAt: (index: number) => void;
}

const DiagramContext = createContext<DiagramContextType | undefined>(undefined);

export function DiagramProvider({ children }: { children: React.ReactNode }) {
    const [chartXML, setChartXML] = useState<string>("");
    const [latestSvg, setLatestSvg] = useState<string>("");
    const [diagramHistory, setDiagramHistory] = useState<
        { svg: string; xml: string }[]
    >([]);
    const [activeVersionIndex, setActiveVersionIndex] = useState<number>(-1);
    const drawioRef = useRef<DrawIoEmbedRef | null>(null);
    const resolverRef = useRef<((value: string) => void) | null>(null);

    const handleExport = () => {
        if (drawioRef.current) {
            drawioRef.current.exportDiagram({
                format: "xmlsvg",
            });
        }
    };

    const loadDiagram = (chart: string) => {
        if (drawioRef.current) {
            drawioRef.current.load({
                xml: chart,
            });
        }
    };

    const handleDiagramExport = (data: any) => {
        const extractedXML = extractDiagramXML(data.data);
        setChartXML(extractedXML);
        setLatestSvg(data.data);
        setDiagramHistory((prev) => {
            const updated = [
                ...prev,
                {
                    svg: data.data,
                    xml: extractedXML,
                },
            ];
            setActiveVersionIndex(updated.length - 1);
            return updated;
        });
        if (resolverRef.current) {
            resolverRef.current(extractedXML);
            resolverRef.current = null;
        }
    };

    const clearDiagram = () => {
        const emptyDiagram = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;
        loadDiagram(emptyDiagram);
        setChartXML(emptyDiagram);
        setLatestSvg("");
        setDiagramHistory([]);
        setActiveVersionIndex(-1);
    };

    const restoreDiagramAt = (index: number) => {
        const entry = diagramHistory[index];
        if (!entry) {
            return;
        }
        loadDiagram(entry.xml);
        setChartXML(entry.xml);
        setLatestSvg(entry.svg);
        setActiveVersionIndex(index);
    };

    return (
        <DiagramContext.Provider
            value={{
                chartXML,
                latestSvg,
                diagramHistory,
                activeVersionIndex,
                loadDiagram,
                handleExport,
                resolverRef,
                drawioRef,
                handleDiagramExport,
                clearDiagram,
                restoreDiagramAt,
            }}
        >
            {children}
        </DiagramContext.Provider>
    );
}

export function useDiagram() {
    const context = useContext(DiagramContext);
    if (context === undefined) {
        throw new Error("useDiagram must be used within a DiagramProvider");
    }
    return context;
}
