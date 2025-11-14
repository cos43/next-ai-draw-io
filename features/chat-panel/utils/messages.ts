import type { UIMessage as Message } from "ai";

export const cloneMessages = (messages: Message[]): Message[] =>
    messages.map((message) => ({ ...message }));
