"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import {
    EndpointModelConfig,
    EndpointModelDraft,
    ModelEndpointConfig,
    ModelEndpointDraft,
    ModelRegistryState,
    RuntimeModelOption,
} from "@/types/model-config";

const STORAGE_KEY = "flowpilot.modelRegistry.v1";

const deriveProviderHint = (baseUrl: string): string => {
    if (!baseUrl) return "自定义接口";
    try {
        const url = new URL(baseUrl);
        return url.hostname.replace(/^www\./, "");
    } catch {
        return baseUrl;
    }
};

const normalizeModel = (
    model: EndpointModelDraft,
    timestamp: number
): EndpointModelConfig | null => {
    const modelId = (model.modelId ?? "").trim();
    if (!modelId) {
        return null;
    }
    const label = (model.label ?? "").trim() || modelId;
    return {
        id: model.id && model.id.trim().length > 0 ? model.id : nanoid(8),
        modelId,
        label,
        description: model.description?.trim() || undefined,
        createdAt: model.createdAt ?? timestamp,
        updatedAt: timestamp,
    };
};

const normalizeEndpoint = (
    draft: ModelEndpointDraft,
    timestamp: number
): ModelEndpointConfig | null => {
    const baseUrl = (draft.baseUrl ?? "").trim();
    const apiKey = (draft.apiKey ?? "").trim();
    if (!baseUrl || !apiKey) {
        return null;
    }

    const models = (draft.models ?? [])
        .map((model) => normalizeModel(model, timestamp))
        .filter((model): model is EndpointModelConfig => Boolean(model));

    if (models.length === 0) {
        return null;
    }

    return {
        id: draft.id && draft.id.trim().length > 0 ? draft.id : nanoid(12),
        name: (draft.name ?? "").trim() || deriveProviderHint(baseUrl),
        baseUrl,
        apiKey,
        models,
        createdAt: draft.createdAt ?? timestamp,
        updatedAt: timestamp,
    };
};

const buildModelKey = (endpointId: string, modelId: string) =>
    `${endpointId}:${modelId}`;

const determineNextSelection = (
    previousKey: string | undefined,
    endpoints: ModelEndpointConfig[]
): string | undefined => {
    if (
        previousKey &&
        endpoints.some((endpoint) =>
            endpoint.models.some(
                (model) => buildModelKey(endpoint.id, model.id) === previousKey
            )
        )
    ) {
        return previousKey;
    }
    const firstEndpoint = endpoints[0];
    if (!firstEndpoint || firstEndpoint.models.length === 0) {
        return undefined;
    }
    return buildModelKey(firstEndpoint.id, firstEndpoint.models[0].id);
};

const flattenModels = (
    endpoints: ModelEndpointConfig[]
): RuntimeModelOption[] => {
    return endpoints.flatMap((endpoint) =>
        endpoint.models.map((model) => ({
            key: buildModelKey(endpoint.id, model.id),
            modelId: model.modelId,
            label: model.label,
            baseUrl: endpoint.baseUrl,
            apiKey: endpoint.apiKey,
            endpointId: endpoint.id,
            endpointName: endpoint.name,
            providerHint: deriveProviderHint(endpoint.baseUrl),
        }))
    );
};

type StateUpdater = (prev: ModelRegistryState) => ModelRegistryState;

export function useModelRegistry() {
    const [state, setState] = useState<ModelRegistryState>({
        endpoints: [],
        selectedModelKey: undefined,
    });
    const [isReady, setIsReady] = useState(false);

    const setAndPersist = useCallback((updater: StateUpdater) => {
        setState((prev) => {
            const next = updater(prev);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    const endpoints = Array.isArray(parsed.endpoints)
                        ? parsed.endpoints
                        : [];
                    const normalizedSelection = determineNextSelection(
                        typeof parsed.selectedModelKey === "string"
                            ? parsed.selectedModelKey
                            : undefined,
                        endpoints
                    );
                    const initialState: ModelRegistryState = {
                        endpoints,
                        selectedModelKey: normalizedSelection,
                    };
                    setState(initialState);
                    if (normalizedSelection !== parsed.selectedModelKey) {
                        window.localStorage.setItem(
                            STORAGE_KEY,
                            JSON.stringify(initialState)
                        );
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load model registry:", error);
        } finally {
            setIsReady(true);
        }
    }, []);

    const models = useMemo(
        () => flattenModels(state.endpoints),
        [state.endpoints]
    );

    const selectModel = useCallback(
        (modelKey: string) => {
            if (!modelKey) return;
            const exists = models.some((model) => model.key === modelKey);
            if (!exists) {
                return;
            }
            setAndPersist((prev) => ({
                ...prev,
                selectedModelKey: modelKey,
            }));
        },
        [models, setAndPersist]
    );

    const saveEndpoints = useCallback(
        (drafts: ModelEndpointDraft[]) => {
            setAndPersist((prev) => {
                const timestamp = Date.now();
                const normalized = drafts
                    .map((draft) => normalizeEndpoint(draft, timestamp))
                    .filter(
                        (endpoint): endpoint is ModelEndpointConfig =>
                            Boolean(endpoint)
                    );
                return {
                    endpoints: normalized,
                    selectedModelKey: determineNextSelection(
                        prev.selectedModelKey,
                        normalized
                    ),
                };
            });
        },
        [setAndPersist]
    );

    const clearRegistry = useCallback(() => {
        setAndPersist(() => ({
            endpoints: [],
            selectedModelKey: undefined,
        }));
    }, [setAndPersist]);

    const selectedModel = useMemo(() => {
        if (!state.selectedModelKey) {
            return undefined;
        }
        return models.find((model) => model.key === state.selectedModelKey);
    }, [models, state.selectedModelKey]);

    return {
        isReady,
        hasConfiguredModels: models.length > 0,
        endpoints: state.endpoints,
        models,
        selectedModelKey: state.selectedModelKey,
        selectedModel,
        selectModel,
        saveEndpoints,
        clearRegistry,
    };
}
