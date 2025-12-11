import type { Snapshot } from './types';
import type { ChatHistoryItem } from './useChatHistory';
import type { IChatMetadata } from './db';
import type { UIMessage } from '~/lib/message';
import type { FileMap } from '../stores/files';
import { useFetch } from '~/lib/hooks/useFetch';

interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatResponse {
  projectId: string;
  messages: UIMessage[];
  metadata?: IChatMetadata;
  createdAt: string;
}

interface SnapshotResponse {
  projectId: string;
  files: FileMap;
  chatIndex: string;
  summary?: string;
  updatedAt: string;
}

const host = import.meta.env.PUBLIC_BACKEND_URL;

export function useHttpDb() {
  const { fetchDataAuthorized } = useFetch();

  const getProject = async (projectId: string): Promise<ProjectResponse> => {
    return fetchDataAuthorized(`${host}/projects/${projectId}`);
  };

  const createProject = async (name: string): Promise<string> => {
    const project = (await fetchDataAuthorized(`${host}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name }),
      headers: {
        'Content-Type': 'application/json',
      },
    })) as ProjectResponse;
    return project.id;
  };

  const getMessages = async (projectId: string): Promise<ChatHistoryItem | undefined> => {
    const storedMessages = (await fetchDataAuthorized(`${host}/projects/${projectId}/chat`)) as ChatResponse;

    if (!storedMessages) {
      return undefined;
    }

    return {
      id: projectId,
      urlId: projectId,
      messages: storedMessages.messages,
      timestamp: new Date(storedMessages.createdAt).toISOString(),
      metadata: storedMessages.metadata,
    };
  };

  const setMessages = async (
    projectId: string,
    messages: UIMessage[],
    description?: string,
    metadata?: IChatMetadata,
  ): Promise<void> => {
    await fetchDataAuthorized(`${host}/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ messages, description, metadata }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  const getSnapshot = async (projectId: string): Promise<Snapshot | undefined> => {
    const snapshot = (await fetchDataAuthorized(`${host}/projects/${projectId}/snapshot`, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
      },
    })) as SnapshotResponse;

    if (!snapshot) {
      return undefined;
    }

    return {
      chatIndex: snapshot.chatIndex,
      files: snapshot.files,
      summary: snapshot.summary,
    };
  };

  const setSnapshot = async (projectId: string, snapshot: Snapshot): Promise<void> => {
    await fetchDataAuthorized(`${host}/projects/${projectId}/snapshot`, {
      method: 'POST',
      body: JSON.stringify(snapshot),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  return {
    getProject,
    createProject,
    getMessages,
    setMessages,
    getSnapshot,
    setSnapshot,
  };
}
