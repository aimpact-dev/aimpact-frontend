import { useEffect } from "react";
import { chatId, chatMetadata, description, lastChatIdx, lastChatSummary, resetChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { streamingState } from '~/lib/stores/streaming';
import { currentParsingMessageState } from '~/lib/stores/parse';


/**
 * Cleans up state related to the chat tab. Resets chat-related nanostores and indexedDB.
 * @constructor
 */
export function ChatHistoryCleanup() {
  useEffect(() => {
    window.addEventListener("beforeunload", cleanup);
    window.addEventListener('unload', cleanup);

    return () => {
      cleanup();
    };
  }, []);

  return null;
}

function cleanup(){
  clearOtherStores();
  resetChatHistory();
}

function clearOtherStores(){
  // Cleaning up store from parse.ts
  currentParsingMessageState.set(null);

  // Cleaning up store from chat.ts
  chatStore.set({
    started: false,
    aborted: false,
    showChat: true,
    initialMessagesIds: [] as string[]
  });

  // Cleaning up store from streaming.ts
  streamingState.set(false);
}
