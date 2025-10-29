import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';
import { currentParsingMessageState } from '../stores/parse';
import { lastChatIdx, lastChatSummary } from '../persistence';
import type { FileMap } from '../stores/files';
import { chatStore } from '../stores/chat';

const logger = createScopedLogger('useMessageParser');

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);

      // TODO: Rename currentParsingMessageState to something that defines the purpose of this store.
      // The purpose of this store is to save id of the artifact currently being parsed.
      currentParsingMessageState.set(data.messageId);
      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data, skipArtifactSave) => {
      logger.trace('onArtifactClose');

      currentParsingMessageState.set(null);
      if (!skipArtifactSave) {
        chatStore.setKey('needToSave', data.messageId);
      }

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
const extractTextContent = (message: Message) =>
  Array.isArray(message.content)
    ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
    : message.content;

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let reset = false;

    if (import.meta.env.DEV && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    for (const [index, message] of messages.entries()) {
      if (message.role === 'assistant' || message.role === 'user') {
        const newParsedContent = messageParser.parse(
          message.id,
          extractTextContent(message),
          message.annotations?.includes('ignore-actions'),
        );
        setParsedMessages((prevParsed) => ({
          ...prevParsed,
          [index]: !reset ? (prevParsed[index] || '') + newParsedContent : newParsedContent,
        }));
      }
    }
  }, []);

  return { parsedMessages, parseMessages };
}
