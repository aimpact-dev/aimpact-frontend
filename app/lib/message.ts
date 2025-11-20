import { type UIMessage as AIUIMessage } from 'ai';
export type UIMessage = AIUIMessage<any | undefined>;

export type MessageDataEvent = { type: string; id?: string; data: any };
