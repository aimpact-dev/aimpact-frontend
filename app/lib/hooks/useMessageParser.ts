import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { getWorkbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';
import { currentParsingMessageState } from '../stores/parse';

const logger = createScopedLogger('useMessageParser');

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);

      //TODO: Rename currentParsingMessageState to something that defines the purpose of this store.
      //The purpose of this store is to save id of the artifact currently being parsed.
      currentParsingMessageState.set(data.messageId);
      getWorkbenchStore().showWorkbench.set(true);
      getWorkbenchStore().addArtifact(data);
    },
    onArtifactClose: (data) => {
      logger.trace('onArtifactClose');

      currentParsingMessageState.set(null);
      getWorkbenchStore().updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      logger.trace('onActionOpen', data.action);

      // we only add shell actions when when the close tag got parsed because only then we have the content
      if (data.action.type === 'file' || data.action.type === 'update') {
        getWorkbenchStore().addAction(data);
      }
    },
    onActionClose: (data) => {
      logger.trace('onActionClose', data.action);

      if (data.action.type !== 'file' && data.action.type !== 'update') {
        getWorkbenchStore().addAction(data);
      }

      getWorkbenchStore().runAction(data);
    },
    onActionStream: (data) => {
      logger.trace('onActionStream', data.action);
      getWorkbenchStore().runAction(data, true);
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
          messages.map((m) => m.id),
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
