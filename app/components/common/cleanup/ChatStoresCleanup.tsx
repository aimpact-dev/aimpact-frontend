import { useEffect } from "react";
import {
  chatId,
  chatMetadata,
  description,
  lastChatIdx,
  lastChatSummary
} from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { streamingState } from '~/lib/stores/streaming';


export function ChatStoresCleanup() {
  useEffect(() => {
    window.addEventListener("beforeunload", clearNanoStores);
    window.addEventListener('unload', clearNanoStores);

    return () => {
      clearNanoStores();
    };
  }, []);

  return null;
}

function clearNanoStores(){
  //Cleaning up stores from useChatHistory.ts
  chatId.set(undefined);
  lastChatIdx.set(undefined);
  lastChatSummary.set(undefined);
  description.set(undefined);
  chatMetadata.set(undefined);

  //Cleaning up store from chat.ts
  chatStore.set({
    started: false,
    aborted: false,
    showChat: true,
  });

  //Cleaning up store from streaming.ts
  streamingState.set(false);
}
