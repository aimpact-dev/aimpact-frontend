import { useNavigate, useSearchParams, useParams } from '@remix-run/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import { openDatabase, duplicateChat, createChatFromMessages, type IChatMetadata } from './db';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';
import { useHttpDb } from './http-db';
import { filterIgnoreFiles } from '~/utils/ignoreFiles';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const lastChatIdx = atom<string | undefined>(undefined);
export const lastChatSummary = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);
export function useChatHistory() {
  const navigate = useNavigate();

  const params = useParams();
  const uuidMatch = window.location.pathname.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  );
  const mixedId = params.id ?? (uuidMatch ? uuidMatch[0] : undefined);

  const [searchParams] = useSearchParams();

  const { getMessages, getSnapshot, setMessages, setSnapshot, createProject } = useHttpDb();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);

  const creatingProjectRef = useRef<boolean>(false);
  const settingProjectWorkaroundRef = useRef<boolean>(false);
  const settingProjectWorkaroundPromise = useRef<Promise<void> | undefined>(undefined);

  useEffect(() => {
    const handleMixedId = async () => {
      if (mixedId) {
        if (settingProjectWorkaroundRef.current && settingProjectWorkaroundPromise.current) {
          await settingProjectWorkaroundPromise.current;
        }

        Promise.all([
          getMessages(mixedId),
          getSnapshot(mixedId), // Fetch snapshot from backend
        ])
          .then(async ([storedMessages, snapshot]) => {
            if (storedMessages && storedMessages.messages.length > 0) {
              /*
               * const snapshotStr = localStorage.getItem(`snapshot:${mixedId}`); // Remove localStorage usage
               * const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} }; // Use snapshot from DB
               */
              const validSnapshot = snapshot || { chatIndex: '', files: {} }; // Ensure snapshot is not undefined
              const summary = validSnapshot.summary;

              const rewindId = searchParams.get('rewindTo');

              let startingIdx = -1;
              const endingIdx = rewindId
                ? storedMessages.messages.findIndex((m) => m.id === rewindId) + 1
                : storedMessages.messages.length;
              const snapshotIndex = storedMessages.messages.findIndex((m) => m.id === validSnapshot.chatIndex);
              
              if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
                startingIdx = snapshotIndex;
              }

              if (snapshotIndex > 0 && storedMessages.messages[snapshotIndex].id == rewindId) {
                startingIdx = -1;
              }
                
              let filteredMessages = storedMessages.messages.slice(startingIdx + 1, endingIdx);
              let archivedMessages: Message[] = [];

              if (startingIdx >= 0) {
                archivedMessages = storedMessages.messages.slice(0, startingIdx + 1);
              }

              setArchivedMessages(archivedMessages);

              if (startingIdx > 0) {
                const files = Object.entries(validSnapshot?.files || {})
                  .map(([key, value]) => {
                    if (value?.type !== 'file') {
                      return null;
                    }

                    return {
                      content: value.content,
                      path: key,
                    };
                  })
                  .filter((x): x is { content: string; path: string } => !!x); // Type assertion
                const projectCommands = await detectProjectCommands(files);

                // Call the modified function to get only the command actions string
                const commandActionsString = createCommandActionsString(projectCommands);

                filteredMessages = [
                  {
                    id: generateId(),
                    role: 'user',
                    content: `Restore project from snapshot`, // Removed newline
                    annotations: ['no-store', 'hidden'],
                  },
                  {
                    id: storedMessages.messages[snapshotIndex].id,
                    role: 'assistant',

                    // Combine followup message and the artifact with files and command actions
                    content: `AImpact Restored your chat from a snapshot. You can revert this message to load the full chat history.
                    <boltArtifact id="restored-project-setup" title="Restored Project & Setup" type="bundled">
                    ${Object.entries(snapshot?.files || {})
                      .map(([key, value]) => {
                        if (value?.type === 'file') {
                          return `
                        <boltAction type="file" filePath="${key}">
  ${value.content}
                        </boltAction>
                        `;
                        } else {
                          return ``;
                        }
                      })
                      .join('\n')}
                    ${commandActionsString} 
                    </boltArtifact>
                    `, // Added commandActionsString, followupMessage, updated id and title
                    annotations: [
                      'no-store',
                      ...(summary
                        ? [
                            {
                              chatId: storedMessages.messages[snapshotIndex].id,
                              type: 'chatSummary',
                              summary,
                            } satisfies ContextAnnotation,
                          ]
                        : []),
                    ],
                  },

                  // Remove the separate user and assistant messages for commands
                  /*
                   *...(commands !== null // This block is no longer needed
                   *  ? [ ... ]
                   *  : []),
                   */
                  ...filteredMessages,
                ];
                restoreSnapshot(mixedId);
              }
              
              setInitialMessages(filteredMessages);

              description.set(storedMessages.description);
              chatId.set(storedMessages.id);
              chatMetadata.set(storedMessages.metadata);
              lastChatIdx.set(storedMessages.messages[snapshotIndex]?.id);
              lastChatSummary.set(summary);
            } else {
              navigate('/', { replace: true });
            }

            setReady(true);
          })
          .catch((error) => {
            console.error(error);

            logStore.logError('Failed to load chat messages or snapshot', error); // Updated error message
            toast.error('Failed to load chat: ' + error.message); // More specific error
          });
      } else {
        // Handle case where there is no mixedId (e.g., new chat)
        setReady(true);
      }
    };

    handleMixedId();
  }, [mixedId, navigate, searchParams]);

  const takeSnapshot = async (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string, disableIngore = false) => {
    const id = _chatId || chatId.get();

    if (!id) {
      return;
    }

    const filteredFiles = disableIngore ? files : filterIgnoreFiles(files);

    const snapshot: Snapshot = {
      chatIndex: chatIdx,
      files,
      summary: chatSummary,
    };

    try {
      await setSnapshot(id, snapshot);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      toast.error('Failed to save chat snapshot.');
    }
  };

  const restoreSnapshot = useCallback(async (id: string, snapshot?: Snapshot) => {
    // const snapshotStr = localStorage.getItem(`snapshot:${id}`); // Remove localStorage usage
    const container = await webcontainer;

    const validSnapshot = snapshot || { chatIndex: '', files: {} };

    if (!validSnapshot?.files) {
      return;
    }

    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    });
    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }

        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      } else {
      }
    });

    // workbenchStore.files.setKey(snapshot?.files)
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    takeSnapshot,
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();

      if (!id) {
        return;
      }

      try {
        await setMessages(id, initialMessages, description.get(), metadata);
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messages: Message[]) => {
      if (messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;
      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      let _chatId = chatId.get();

      // Ensure chatId.get() is used here as well
      if (initialMessages.length === 0 && !_chatId && !mixedId && !creatingProjectRef.current) {
        creatingProjectRef.current = true;

        _chatId = await createProject(`${firstArtifact?.title || `Sample Project ${Date.now()}`}`);

        chatId.set(_chatId);
        navigateChat(_chatId);

        creatingProjectRef.current = false;
      }

      let chatSummary: string | undefined = undefined;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'assistant') {
        const annotations = lastMessage.annotations as JSONValue[];
        const filteredAnnotations = (annotations?.filter(
          (annotation: JSONValue) =>
            annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
        ) || []) as { type: string; value: any } & { [key: string]: any }[];

        if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
          chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
        }
      }

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      // Ensure chatId.get() is used for the final setMessages call
      const finalChatId = _chatId;

      if (!finalChatId) {
        console.error('Cannot save messages, chat ID is not set.');
        toast.error('Failed to save chat messages: Chat ID missing.');

        return;
      }

      if (!settingProjectWorkaroundRef.current) {
        settingProjectWorkaroundRef.current = true;

        try {
          settingProjectWorkaroundPromise.current = setMessages(
            finalChatId, // Use the potentially updated chatId
            [...archivedMessages, ...messages],
            description.get(),
            chatMetadata.get(),
          ).then(async () => {
            lastChatIdx.set(messages[messages.length - 1].id);
            lastChatSummary.set(chatSummary);
            return takeSnapshot(messages[messages.length - 1].id, workbenchStore.files.get(), finalChatId, chatSummary);
          });

          await settingProjectWorkaroundPromise.current;
        } finally {
          settingProjectWorkaroundPromise.current = undefined;
          settingProjectWorkaroundRef.current = false;
        }
      }
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!db || (!mixedId && !listItemId)) {
        return;
      }

      try {
        const newId = await duplicateChat(db, mixedId || listItemId);
        navigate(`/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      if (!db) {
        return;
      }

      try {
        const newId = await createChatFromMessages(db, description, messages, metadata);
        window.location.href = `/chat/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = chatId.get()) => {
      if (!id) {
        return;
      }

      const chat = await getMessages(id);

      if (!chat) {
        return;
      }

      const chatData = {
        messages: chat.messages,
        description: chat.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
