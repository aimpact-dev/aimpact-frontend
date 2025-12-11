import type { UIMessage } from 'ai';
import { useCallback, useState } from 'react';
import {
  StreamingMessageParser,
  type ActionCallbackData,
  type ArtifactCallbackData,
} from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';
import { currentParsingMessageState } from '../stores/parse';
import { extractContentFromUI } from '~/utils/message';
import { useViewport } from './useViewport';

const logger = createScopedLogger('useMessageParser');

const createMessageParserCallbacks = ({ isDesktop = true }: { isDesktop?: boolean }) => ({
  onArtifactOpen: (data: ArtifactCallbackData) => {
    logger.trace('onArtifactOpen', data);

    //TODO: Rename currentParsingMessageState to something that defines the purpose of this store.
    //The purpose of this store is to save id of the artifact currently being parsed.
    currentParsingMessageState.set(data.messageId);
    if (isDesktop) {
      workbenchStore.setShowWorkbench(true);
    }
    workbenchStore.addArtifact(data);
  },
  onArtifactClose: (data: ArtifactCallbackData) => {
    logger.trace('onArtifactClose');

    currentParsingMessageState.set(null);
    workbenchStore.updateArtifact(data, { closed: true });
  },
  onActionOpen: (data: ActionCallbackData) => {
    logger.trace('onActionOpen', data.action);

    // we only add shell actions when when the close tag got parsed because only then we have the content
    if (data.action.type === 'file' || data.action.type === 'update') {
      workbenchStore.addAction(data);
    }
  },
  onActionClose: (data: ActionCallbackData) => {
    logger.trace('onActionClose', data.action);

    if (data.action.type !== 'file' && data.action.type !== 'update') {
      workbenchStore.addAction(data);
    }

    workbenchStore.runAction(data);
  },
  onActionStream: (data: ActionCallbackData) => {
    logger.trace('onActionStream', data.action);
    workbenchStore.runAction(data, true);
  },
});

export function useMessageParser() {
  const { isMobile } = useViewport();
  const isDesktop = !isMobile;

  const messageParser = new StreamingMessageParser({
    callbacks: createMessageParserCallbacks({ isDesktop }),
  });

  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const parseMessages = useCallback((messages: UIMessage[], isLoading: boolean) => {
    let reset = false;

    // console.log('IS DEV', import.meta.env.DEV, !isLoading);
    // if (import.meta.env.DEV && !isLoading) {
    //   reset = true;
    //   messageParser.reset();
    // }

    for (const [index, message] of messages.entries()) {
      const newParsedContent = messageParser.parse(
        message.id,
        extractContentFromUI(message),
      );
      setParsedMessages((prevParsed) => ({
        ...prevParsed,
        [index]: !reset ? (prevParsed[index] || '') + newParsedContent : newParsedContent,
      }));
    }
  }, []);

  return { parsedMessages, parseMessages };
}
