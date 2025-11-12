"use client";

import { useState, useCallback } from "react";

export interface ChatState {
  isConversationStarted: boolean;
  messageCount: number;
  isCompactMode: boolean;
}

export function useChatState() {
  const [state, setState] = useState<ChatState>({
    isConversationStarted: false,
    messageCount: 0,
    isCompactMode: false,
  });

  const startConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConversationStarted: true,
      isCompactMode: true,
    }));
  }, []);

  const incrementMessageCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1,
    }));
  }, []);

  const clearConversation = useCallback(() => {
    setState({
      isConversationStarted: false,
      messageCount: 0,
      isCompactMode: false,
    });
  }, []);

  const toggleCompactMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCompactMode: !prev.isCompactMode,
    }));
  }, []);

  return {
    ...state,
    startConversation,
    incrementMessageCount,
    clearConversation,
    toggleCompactMode,
  };
}
