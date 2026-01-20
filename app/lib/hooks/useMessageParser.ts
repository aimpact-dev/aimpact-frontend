import { useCallback, useState } from 'react';
import {
  StreamingMessageParser,
  type ActionCallbackData,
  type ArtifactCallbackData,
} from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';
import { currentParsingMessageState } from '../stores/parse';
import { chatStore } from '../stores/chat';
import { extractContentFromUI } from '~/utils/message';
import type { UIMessage, UITool, UITools } from '../message';
import { useViewport } from './useViewport';
import { getToolName, isToolUIPart, type ToolUIPart, type UIMessagePart } from 'ai';

const logger = createScopedLogger('useMessageParser');

export type MessageState = { artifactClosed: boolean };

const createMessageParserCallbacks = ({ isDesktop = true }: { isDesktop?: boolean }) => ({
  onArtifactOpen: (data: ArtifactCallbackData) => {
    logger.trace('onArtifactOpen', data);

    if (isDesktop) {
      workbenchStore.setShowWorkbench(true);
    }
    workbenchStore.addArtifact(data);
  },
  onArtifactClose: (data: ArtifactCallbackData, skipArtifactSave?: boolean) => {
    logger.trace('onArtifactClose');

    workbenchStore.updateArtifact(data, { closed: true });
  },
  onActionOpen: (data: ActionCallbackData, skipAction?: boolean) => {
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
  onActionClose: (data: ActionCallbackData, skipAction?: boolean) => {
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
  onActionStream: (data: ActionCallbackData, skipAction?: boolean) => {
    logger.trace('onActionStream', data.action);
    if (!skipAction) {
      workbenchStore.runAction(data, true);
    }
  },
});

export function useMessageParser() {
  const { isMobile } = useViewport();
  const isDesktop = !isMobile;

  const messageCallbacks = createMessageParserCallbacks({ isDesktop });
  const messageParser = new StreamingMessageParser({
    callbacks: messageCallbacks,
  });

  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const addToolToWorkbench = (toolCall: ToolUIPart<UITools>, message: UIMessage) => {
    const baseArtifact = {
      actionId: toolCall.toolCallId,
      artifactId: message.id,
      messageId: message.id,
    };

    if (toolCall.state !== 'input-available') return;

    if (toolCall.type === 'tool-createFile') {
      const { content, filePath } = toolCall.input;
      const payload: ActionCallbackData = {
        action: {
          type: 'file',
          content,
          filePath,
        },
        ...baseArtifact,
      };
      messageCallbacks.onActionOpen(payload);
      messageCallbacks.onActionClose(payload);
    } else if (toolCall.type === 'tool-updateFile') {
      const { filePath, newContent, occurrences, oldContent, n } = toolCall.input;
      const payload: ActionCallbackData = {
        action: {
          type: 'update',
          filePath,
          n,
          newContent,
          oldContent,
          occurrences,
        },
        ...baseArtifact,
      };
      messageCallbacks.onActionOpen(payload);
      messageCallbacks.onActionClose(payload);
    } else if (toolCall.type === 'tool-executeShellCommand') {
      const { command } = toolCall.input;
      const payload: ActionCallbackData = {
        action: {
          type: 'shell',
          content: command,
        },
        ...baseArtifact,
      };
      messageCallbacks.onActionOpen(payload);
      messageCallbacks.onActionClose(payload);
    }
  };

  const parseToolMessages = (messages: UIMessage[]) => {
    for (const [index, message] of messages.entries()) {
      const artifact = workbenchStore.getArtifact(message.id);
      console.log('is artifact exists', artifact);
      if (!artifact) {
        messageCallbacks.onArtifactOpen({
          id: message.id,
          messageId: message.id,
          title: 'AI response',
        });
        console.log('artifact created', workbenchStore.getArtifact(message.id));
      }

      const existingToolsCalls = Object.keys(workbenchStore.toolCalls.get());
      const toolCalls = message.parts.filter(
        (p) => isToolUIPart(p)
      );

      for (const toolCall of toolCalls) {
        if (existingToolsCalls.includes(toolCall.toolCallId)) continue;
        addToolToWorkbench(toolCall, message);
      }
      
      const parsed = messageParser.parseWithTools(message);
      setParsedMessages((prevParsed) => ({
        ...prevParsed,
        [index]: parsed,
      }));
    }
  };

  const shouldSkipMessage = (message: UIMessage) => {
    // TODO: review it. should it be || or && ?
    return message.metadata?.ignoreActions || message.metadata?.artifactActionsFinished;
  };

  const parseOldXmlMessages = (messages: UIMessage[]) => {
    let reset = false;

    const messagesState: Record<string, MessageState> = {};
    for (const [index, message] of messages.entries()) {
      messagesState[message.id] = { artifactClosed: false };
      const { parsed: newParsedContent, artifactClosed } = messageParser.parse(
        message.id,
        extractContentFromUI(message),
        shouldSkipMessage(message),
      );
      setParsedMessages((prevParsed) => ({
        ...prevParsed,
        [index]: !reset ? (prevParsed[index] || '') + newParsedContent : newParsedContent,
      }));

      messagesState[message.id].artifactClosed = artifactClosed;
    }

    return messagesState;
  };

  const parseMessages = useCallback((messages: UIMessage[]) => {
    const hasToolCall = messages.some((m) => m.parts.some((m) => m.type.startsWith('tool-')));
    if (hasToolCall) {
      return parseToolMessages(messages);
    } else {
      return parseOldXmlMessages(messages);
    }
  }, []);

  return { parsedMessages, parseMessages, addToolToWorkbench };
}
