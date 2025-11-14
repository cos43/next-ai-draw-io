"use client";

import { useEffect } from "react";
import { isDrawioRuntimeErrorMessage } from "@/lib/diagram-validation";
import { RuntimeErrorPayload } from "@/types/diagram";

interface UseDrawioDiagnosticsOptions {
    baseUrl?: string;
    onRuntimeError?: (error: RuntimeErrorPayload) => void;
    onRuntimeSignal?: (event: any) => void;
}

function isFromDrawio(origin: string, expected?: string) {
    if (!origin) {
        return false;
    }
    const normalizedOrigin = origin.toLowerCase();
    if (normalizedOrigin.includes("embed.diagrams.net")) {
        return true;
    }
    if (!expected) {
        return false;
    }
    try {
        const expectedUrl = new URL(expected);
        return normalizedOrigin.startsWith(expectedUrl.origin.toLowerCase());
    } catch {
        return false;
    }
}

function parseMessage(event: MessageEvent) {
    if (typeof event.data === "string") {
        try {
            return JSON.parse(event.data);
        } catch {
            return event.data;
        }
    }
    return event.data;
}

export function useDrawioDiagnostics({
    baseUrl,
    onRuntimeError,
    onRuntimeSignal,
}: UseDrawioDiagnosticsOptions) {
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (!isFromDrawio(event.origin ?? "", baseUrl)) {
                return;
            }
            const payload = parseMessage(event);
            if (!payload) {
                return;
            }

            if (typeof payload?.event === "string") {
                onRuntimeSignal?.(payload);
                if (
                    payload.event === "status" &&
                    typeof payload?.message === "string" &&
                    isDrawioRuntimeErrorMessage(payload.message)
                ) {
                    onRuntimeError?.({
                        type: "status",
                        message: payload.message,
                        rawEvent: payload,
                    });
                    return;
                }

                if (
                    payload.event === "merge" &&
                    typeof payload?.error === "string" &&
                    payload.error.length > 0
                ) {
                    onRuntimeError?.({
                        type: "merge",
                        message: payload.error,
                        rawEvent: payload,
                    });
                    return;
                }
            }

            if (
                typeof payload === "string" &&
                isDrawioRuntimeErrorMessage(payload)
            ) {
                onRuntimeError?.({
                    type: "raw",
                    message: payload,
                    rawEvent: payload,
                });
            }
        };

        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, [baseUrl, onRuntimeError, onRuntimeSignal]);
}
