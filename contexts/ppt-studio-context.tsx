"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { nanoid } from "nanoid";
import type {
    PptBrief,
    PptBlueprint,
    PptStudioStep,
    SlideBlueprint,
    SlideJob,
    StyleOverrides,
} from "@/types/ppt";

interface PptStudioContextValue {
    step: PptStudioStep;
    setStep: (step: PptStudioStep) => void;
    brief: PptBrief;
    updateBrief: (patch: Partial<PptBrief>) => void;
    blueprint: PptBlueprint | null;
    setBlueprint: (blueprint: PptBlueprint | null) => void;
    updateSlideBlueprint: (
        slideId: string,
        patch: Partial<SlideBlueprint>
    ) => void;
    reorderSlides: (from: number, to: number) => void;
    addSlideAfter: (afterSlideId: string | null) => void;
    removeSlide: (slideId: string) => void;
    slideJobs: Record<string, SlideJob>;
    updateSlideJob: (slideId: string, patch: Partial<SlideJob>) => void;
    resetSlideJobs: () => void;
    focusedSlideId: string | null;
    setFocusedSlideId: (slideId: string | null) => void;
    styleLocks: StyleOverrides;
    updateStyleLocks: (patch: Partial<StyleOverrides>) => void;
    lastSavedAt: number | null;
    clearAll: () => void;
}

const STORAGE_KEY = "flowpilot.pptStudio.v1";

const defaultBrief: PptBrief = {
    topic: "",
    audience: "",
    goal: "inform",
    tone: "balanced",
    slideCount: 8,
    keywords: [],
    narrativeFocus: "",
    referenceAssets: [],
    constraints: {
        palette: [],
        forbidden: [],
        mustInclude: [],
    },
};

const defaultStyleLocks: StyleOverrides = {
    palette: [],
    typography: "",
    iconography: "",
    layoutTone:
        "全屏深色背景 + 玻璃拟态白色内容卡片 + 均衡留白 + 顶部标题条 + 轻微阴影",
};

const PptStudioContext = createContext<PptStudioContextValue | undefined>(
    undefined
);

const ensureSlideIds = (blueprint: PptBlueprint): PptBlueprint => {
    const existingIds = new Set<string>();
    return {
        ...blueprint,
        slides: blueprint.slides.map((slide) => {
            if (!slide.id || existingIds.has(slide.id)) {
                const id = nanoid(8);
                existingIds.add(id);
                return { ...slide, id };
            }
            existingIds.add(slide.id);
            return slide;
        }),
    };
};

export function PptStudioProvider({ children }: { children: React.ReactNode }) {
    const [brief, setBrief] = useState<PptBrief>(defaultBrief);
    const [blueprint, setBlueprintState] = useState<PptBlueprint | null>(null);
    const [step, setStep] = useState<PptStudioStep>("brief");
    const [slideJobs, setSlideJobs] = useState<Record<string, SlideJob>>({});
    const [focusedSlideId, setFocusedSlideId] = useState<string | null>(null);
    const [styleLocks, setStyleLocks] = useState<StyleOverrides>(defaultStyleLocks);
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.brief) {
                    setBrief({
                        ...defaultBrief,
                        ...parsed.brief,
                        constraints: {
                            ...defaultBrief.constraints,
                            ...parsed.brief.constraints,
                        },
                    });
                }
                if (parsed.blueprint) {
                    setBlueprintState(ensureSlideIds(parsed.blueprint));
                    setStep(parsed.step ?? "blueprint");
                }
                if (parsed.styleLocks) {
                    setStyleLocks({
                        ...defaultStyleLocks,
                        ...parsed.styleLocks,
                    });
                }
                if (parsed.lastSavedAt) {
                    setLastSavedAt(parsed.lastSavedAt);
                }
            }
        } catch (error) {
            console.error("Failed to hydrate PPT studio state:", error);
        } finally {
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    brief,
                    blueprint,
                    styleLocks,
                    step,
                    lastSavedAt: Date.now(),
                })
            );
            setLastSavedAt(Date.now());
        } catch (error) {
            console.error("Failed to persist PPT studio state:", error);
        }
    }, [brief, blueprint, styleLocks, step, isHydrated]);

    const updateBrief = useCallback((patch: Partial<PptBrief>) => {
        setBrief((prev) => ({
            ...prev,
            ...patch,
            constraints: {
                ...prev.constraints,
                ...(patch.constraints ?? {}),
            },
        }));
    }, []);

    const setBlueprint = useCallback((next: PptBlueprint | null) => {
        setBlueprintState(next ? ensureSlideIds(next) : null);
        setSlideJobs({});
        if (next) {
            setFocusedSlideId(next.slides[0]?.id ?? null);
        }
    }, []);

    const updateSlideBlueprint = useCallback(
        (slideId: string, patch: Partial<SlideBlueprint>) => {
            setBlueprintState((prev) => {
                if (!prev) return prev;
                const slides = prev.slides.map((slide) =>
                    slide.id === slideId
                        ? {
                              ...slide,
                              ...patch,
                              status: "edited" as const,
                          }
                        : slide
                );
                return { ...prev, slides };
            });
        },
        []
    );

    const reorderSlides = useCallback((from: number, to: number) => {
        setBlueprintState((prev) => {
            if (!prev) return prev;
            const slides = [...prev.slides];
            const [moved] = slides.splice(from, 1);
            slides.splice(to, 0, moved);
            return { ...prev, slides };
        });
    }, []);

    const addSlideAfter = useCallback((afterSlideId: string | null) => {
        setBlueprintState((prev) => {
            if (!prev) return prev;
            const newSlide: SlideBlueprint = {
                id: nanoid(8),
                title: "新增幻灯片",
                narrative: "请在此描述这一页要表达的关键信息。",
                bullets: ["关键要点 1", "关键要点 2"],
                visualIdea: "矩阵或示意图",
                status: "edited",
            };
            const slides = [...prev.slides];
            if (!afterSlideId) {
                slides.unshift(newSlide);
            } else {
                const index = slides.findIndex((slide) => slide.id === afterSlideId);
                if (index === -1) {
                    slides.push(newSlide);
                } else {
                    slides.splice(index + 1, 0, newSlide);
                }
            }
            return { ...prev, slides };
        });
    }, []);

    const removeSlide = useCallback((slideId: string) => {
        setBlueprintState((prev) => {
            if (!prev) return prev;
            const slides = prev.slides.filter((slide) => slide.id !== slideId);
            setSlideJobs((jobs) => {
                const clone = { ...jobs };
                delete clone[slideId];
                return clone;
            });
            return { ...prev, slides };
        });
    }, []);

    const updateSlideJob = useCallback((slideId: string, patch: Partial<SlideJob>) => {
        setSlideJobs((prev) => {
            const existing =
                prev[slideId] ||
                ({
                    slideId,
                    status: "idle",
                } as SlideJob);
            return {
                ...prev,
                [slideId]: {
                    ...existing,
                    ...patch,
                },
            };
        });
    }, []);

    const resetSlideJobs = useCallback(() => {
        setSlideJobs({});
    }, []);

    const updateStyleLocks = useCallback(
        (patch: Partial<StyleOverrides>) => {
            setStyleLocks((prev) => ({
                ...prev,
                ...patch,
            }));
        },
        []
    );

    const clearAll = useCallback(() => {
        setBrief(defaultBrief);
        setBlueprintState(null);
        setSlideJobs({});
        setStep("brief");
        setStyleLocks(defaultStyleLocks);
        setFocusedSlideId(null);
        setLastSavedAt(Date.now());
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    const value = useMemo<PptStudioContextValue>(
        () => ({
            step,
            setStep,
            brief,
            updateBrief,
            blueprint,
            setBlueprint,
            updateSlideBlueprint,
            reorderSlides,
            addSlideAfter,
            removeSlide,
            slideJobs,
            updateSlideJob,
            resetSlideJobs,
            focusedSlideId,
            setFocusedSlideId,
            styleLocks,
            updateStyleLocks,
            lastSavedAt,
            clearAll,
        }),
        [
            step,
            brief,
            blueprint,
            reorderSlides,
            slideJobs,
            focusedSlideId,
            styleLocks,
            lastSavedAt,
            updateBrief,
            setBlueprint,
            updateSlideBlueprint,
            addSlideAfter,
            removeSlide,
            updateSlideJob,
            resetSlideJobs,
            updateStyleLocks,
            clearAll,
        ]
    );

    return (
        <PptStudioContext.Provider value={value}>
            {children}
        </PptStudioContext.Provider>
    );
}

export function usePptStudio() {
    const context = useContext(PptStudioContext);
    if (!context) {
        throw new Error("usePptStudio must be used within PptStudioProvider");
    }
    return context;
}
