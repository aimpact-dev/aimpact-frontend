import { type UIMessage as AIUIMessage } from 'ai';

export type UIMessageMetadata = any;
export type UIMessage = AIUIMessage<any | undefined>;

export type MessageDataEvent = { type: string; id?: string; data: any };
export type Import = { type: string; id?: string; data: any };
