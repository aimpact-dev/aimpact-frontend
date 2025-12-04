import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';
import { currentParsingMessageState } from '../stores/parse';
import { chatStore } from '../stores/chat';
import { extractContentFromUI } from '~/utils/message';
import type { UIMessage } from '../message';

const logger = createScopedLogger('useMessageParser');

export type MessageState = { artifactClosed: boolean };

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);

      // TODO: Rename currentParsingMessageState to something that defines the purpose of this store.
      // The purpose of this store is to save id of the artifact currently being parsed.
      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data, skipArtifactSave) => {
      logger.trace('onArtifactClose');

      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data, skipAction) => {
      logger.trace('onActionOpen', data.action);

      // we only add shell actions when when the close tag got parsed because only then we have the content
      if (data.action.type === 'file' || data.action.type === 'update') {
        // we only add action data and ignore execution if skipAction = true
        workbenchStore.addAction(data, skipAction);
      }

      if (skipAction) {
        workbenchStore.skipAction(data);
      }
    },
    onActionClose: (data, skipAction) => {
      logger.trace('onActionClose', data.action);
      if (data.action.type !== 'file' && data.action.type !== 'update') {
        workbenchStore.addAction(data, skipAction);
      }

      if (skipAction) {
        workbenchStore.skipAction(data);
      } else {
        workbenchStore.runAction(data);
      }
    },
    onActionStream: (data, skipAction) => {
      logger.trace('onActionStream', data.action);
      if (!skipAction) {
        workbenchStore.runAction(data, true);
      }
    },
  },
});

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const parseMessages = useCallback((messages: UIMessage[], isLoading: boolean) => {
    let reset = false;

    if (import.meta.env.DEV && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    const messagesState: Record<string, MessageState> = {};
    for (const [index, message] of messages.entries()) {
      messagesState[message.id] = { artifactClosed: false };
      const { parsed: newParsedContent, artifactClosed } = messageParser.parse(
        message.id,
        extractContentFromUI(message),
        message.metadata?.ignoreActions && message.metadata?.artifactActionsFinished,
      );
      setParsedMessages((prevParsed) => ({
        ...prevParsed,
        [index]: !reset ? (prevParsed[index] || '') + newParsedContent : newParsedContent,
      }));

      messagesState[message.id].artifactClosed = artifactClosed;
    }

    return messagesState;
  }, []);

  return { parsedMessages, parseMessages };
}
