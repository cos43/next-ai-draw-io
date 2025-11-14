export interface EndpointModelConfig {
    id: string;
    modelId: string;
    label: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
}

export interface ModelEndpointConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    models: EndpointModelConfig[];
    createdAt: number;
    updatedAt: number;
}

export interface RuntimeModelConfig {
    modelId: string;
    baseUrl: string;
    apiKey: string;
    label?: string;
}

export interface RuntimeModelOption extends RuntimeModelConfig {
    key: string;
    endpointId: string;
    endpointName: string;
    providerHint: string;
}

export interface ModelRegistryState {
    endpoints: ModelEndpointConfig[];
    selectedModelKey?: string;
}

export type EndpointModelDraft = Omit<EndpointModelConfig, "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
};

export type ModelEndpointDraft = Omit<ModelEndpointConfig, "createdAt" | "updatedAt" | "models"> & {
    createdAt?: number;
    updatedAt?: number;
    models: EndpointModelDraft[];
};
