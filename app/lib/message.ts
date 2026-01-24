import { tool, type UIMessage as AIUIMessage, type InferUITools, type StaticToolCall, type ToolSet } from 'ai';
import z from 'zod';

export type UIMessageMetadata = any;

export const toolSet = {
  executeShellCommand: tool({
    inputSchema: z.object({
      command: z.string(),
    }),
  }),

  createFile: tool({
    inputSchema: z.object({
      filePath: z.string(),
      content: z.string(),
    }),
  }),

  updateFile: tool({
    inputSchema: z.object({
      filePath: z.string(),
      oldContent: z.string(),
      newContent: z.string(),
      occurrences: z.enum(['first', 'all', 'nth']).default('all'),
      n: z.number().int().optional(),
    }),
  }),
} satisfies ToolSet;

export type UITools = InferUITools<typeof toolSet>;
export type UITool = StaticToolCall<typeof toolSet>;

export type UIMessage = AIUIMessage<any | undefined, any, InferUITools<typeof toolSet>>;

export type MessageDataEvent = { type: string; id?: string; data: any };
