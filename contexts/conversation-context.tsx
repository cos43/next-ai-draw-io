"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";
import type { UIMessage as Message } from "ai";

interface ConversationBranchMeta {
    type: "root" | "comparison" | "manual" | "history";
    comparisonRequestId?: string;
    comparisonResultId?: string;
    label?: string;
}

export interface ConversationBranch {
    id: string;
    parentId: string | null;
    label: string;
    createdAt: string;
    messages: Message[];
    diagramXml: string | null;
    meta?: ConversationBranchMeta;
}

interface CreateBranchInput {
    label?: string;
    diagramXml?: string | null;
    inheritMessages?: boolean;
    meta?: ConversationBranchMeta;
    parentId?: string;
    activate?: boolean;
    seedMessages?: Message[];
}

interface ConversationContextValue {
    branches: Record<string, ConversationBranch>;
    branchList: ConversationBranch[];
    branchTrail: ConversationBranch[];
    activeBranchId: string;
    activeBranch: ConversationBranch;
    createBranch: (input?: CreateBranchInput) => ConversationBranch | null;
    switchBranch: (branchId: string) => ConversationBranch | null;
    updateActiveBranchMessages: (messages: Message[]) => void;
    updateActiveBranchDiagram: (diagramXml: string | null) => void;
    resetActiveBranch: () => void;
}

const ROOT_BRANCH_ID = "branch-root";

const ConversationContext = createContext<ConversationContextValue | undefined>(
    undefined
);

const createBranchId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `branch-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createRootBranch = (): ConversationBranch => ({
    id: ROOT_BRANCH_ID,
    parentId: null,
    label: "主干",
    createdAt: new Date().toISOString(),
    messages: [],
    diagramXml: null,
    meta: { type: "root" },
});

const cloneMessages = (messages: Message[]): Message[] =>
    messages.map((message) => ({ ...message }));

export function ConversationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [branches, setBranches] = useState<Record<string, ConversationBranch>>(
        () => {
            const root = createRootBranch();
            return { [root.id]: root };
        }
    );
    const [branchOrder, setBranchOrder] = useState<string[]>([ROOT_BRANCH_ID]);
    const [activeBranchId, setActiveBranchId] = useState(ROOT_BRANCH_ID);
    const pendingBranchRef = useRef<ConversationBranch | null>(null);

    const activeBranch =
        branches[activeBranchId] ?? branches[ROOT_BRANCH_ID] ?? createRootBranch();

    const branchList = useMemo(
        () =>
            branchOrder
                .map((id) => branches[id])
                .filter(Boolean) as ConversationBranch[],
        [branchOrder, branches]
    );

    const branchTrail = useMemo(() => {
        const trail: ConversationBranch[] = [];
        let current: ConversationBranch | undefined = activeBranch;
        const guard = new Set<string>();
        while (current && !guard.has(current.id)) {
            guard.add(current.id);
            trail.unshift(current);
            current =
                current.parentId && branches[current.parentId]
                    ? branches[current.parentId]
                    : undefined;
        }
        return trail;
    }, [activeBranch, branches]);

    const updateActiveBranchMessages = useCallback(
        (messages: Message[]) => {
            setBranches((prev) => {
                const branch = prev[activeBranchId];
                if (!branch) {
                    return prev;
                }
                if (branch.messages === messages) {
                    return prev;
                }
                return {
                    ...prev,
                    [activeBranchId]: {
                        ...branch,
                        messages,
                    },
                };
            });
        },
        [activeBranchId]
    );

    const updateActiveBranchDiagram = useCallback(
        (diagramXml: string | null) => {
            setBranches((prev) => {
                const branch = prev[activeBranchId];
                if (!branch) {
                    return prev;
                }
                if (branch.diagramXml === diagramXml) {
                    return prev;
                }
                return {
                    ...prev,
                    [activeBranchId]: {
                        ...branch,
                        diagramXml,
                    },
                };
            });
        },
        [activeBranchId]
    );

    const resetActiveBranch = useCallback(() => {
        setBranches((prev) => {
            const branch = prev[activeBranchId];
            if (!branch) {
                return prev;
            }
            return {
                ...prev,
                [activeBranchId]: {
                    ...branch,
                    messages: [],
                },
            };
        });
    }, [activeBranchId]);

    const createBranch = useCallback(
        (input?: CreateBranchInput) => {
            const sourceId = input?.parentId ?? activeBranchId;
            const inheritMessages =
                input?.inheritMessages === undefined ? true : input.inheritMessages;
            const labelFromInput = input?.label?.trim();
            const shouldActivate =
                input?.activate === undefined ? true : input.activate;
            const newId = createBranchId();
            pendingBranchRef.current = null;

            // 边界检查：确保 source branch 存在
            const parent = branches[sourceId];
            if (!parent) {
                console.error(`无法创建分支：父分支 ${sourceId} 不存在`);
                return null;
            }

            // 边界检查：验证 seedMessages 数组
            const seedMessages =
                input?.seedMessages && Array.isArray(input.seedMessages) && input.seedMessages.length > 0
                    ? cloneMessages(input.seedMessages)
                    : null;

            // 边界检查：验证 meta 对象
            const meta = input?.meta ?? { type: "manual" };
            if (!meta.type) {
                meta.type = "manual";
            }

            setBranches((prev) => {
                const branchMessages = seedMessages
                    ? seedMessages
                    : inheritMessages
                      ? [...parent.messages]
                      : [];
                      
                const branch: ConversationBranch = {
                    id: newId,
                    parentId: sourceId,
                    label:
                        labelFromInput && labelFromInput.length > 0
                            ? labelFromInput
                            : `分支 ${branchOrder.length}`,
                    createdAt: new Date().toISOString(),
                    messages: branchMessages,
                    diagramXml:
                        input?.diagramXml !== undefined
                            ? input.diagramXml
                            : parent.diagramXml ?? null,
                    meta,
                };
                pendingBranchRef.current = branch;
                return {
                    ...prev,
                    [branch.id]: branch,
                };
            });
            setBranchOrder((prev) => [...prev, newId]);
            if (shouldActivate) {
                setActiveBranchId(newId);
            }

            return pendingBranchRef.current;
        },
        [activeBranchId, branchOrder, branches]
    );

    const switchBranch = useCallback(
        (branchId: string) => {
            if (!branches[branchId]) {
                console.warn(`Branch ${branchId} 不存在，无法切换。`);
                return null;
            }
            setActiveBranchId(branchId);
            return branches[branchId];
        },
        [branches]
    );

    const value = useMemo(
        () => ({
            branches,
            branchList,
            branchTrail,
            activeBranchId,
            activeBranch,
            createBranch,
            switchBranch,
            updateActiveBranchMessages,
            updateActiveBranchDiagram,
            resetActiveBranch,
        }),
        [
            branches,
            branchList,
            branchTrail,
            activeBranchId,
            activeBranch,
            createBranch,
            switchBranch,
            updateActiveBranchMessages,
            updateActiveBranchDiagram,
            resetActiveBranch,
        ]
    );

    return (
        <ConversationContext.Provider value={value}>
            {children}
        </ConversationContext.Provider>
    );
}

export function useConversationManager() {
    const context = useContext(ConversationContext);
    if (!context) {
        throw new Error(
            "useConversationManager 必须在 ConversationProvider 中使用。"
        );
    }
    return context;
}
