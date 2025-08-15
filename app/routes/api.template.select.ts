import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { IProviderSetting, ProviderInfo } from '~/types/model';
import { generateText } from 'ai';
import { DEFAULT_MINI_MODEL, DEFAULT_MINI_PROVIDER, PROVIDER_LIST } from '~/utils/constants';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { parseCookies } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { STARTER_TEMPLATES } from '~/utils/constants';
import { starterTemplateSelectionPrompt } from '~/lib/common/prompts/prompts';

const defaultApiKeys = {
  OpenAI: process.env.OPENAI_API_KEY as string,
};
const providerSettings: Record<string, IProviderSetting> = {};

export async function action(args: ActionFunctionArgs) {
  return templateSelectAction(args);
}

async function getModelList(options: {
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  serverEnv?: Record<string, string>;
}) {
  const llmManager = LLMManager.getInstance(import.meta.env);
  return llmManager.updateModelList(options);
}

const logger = createScopedLogger('api.template.select');

async function templateSelectAction({ context, request }: ActionFunctionArgs) {
  const { message, streamOutput } = await request.json<{
    message: string;
    streamOutput?: boolean;
  }>();

  const model = DEFAULT_MINI_MODEL;
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  const authToken = cookies.authToken;

  if (!authToken) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userResponse = await fetch(`${import.meta.env.PUBLIC_BACKEND_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  if (!userResponse.ok) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const user = (await userResponse.json()) as { id: string; messagesLeft: number, pendingMessages: number };
  const usableMessages = user.messagesLeft - user.pendingMessages;
  if (usableMessages <= 0) {
    throw new Response('You have no messages left', {
      status: 403,
      statusText: 'Forbidden',
    });
  }

  const systemPrompt = starterTemplateSelectionPrompt(STARTER_TEMPLATES);

  const provider = DEFAULT_MINI_PROVIDER as ProviderInfo;
  const { name: providerName } = provider;

  // validate 'provider' fields
  if (!providerName || typeof providerName !== 'string') {
    throw new Response('Invalid or missing provider', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  const apiKeys = defaultApiKeys;

  if (streamOutput) {
    try {
      const result = await streamText({
        options: {
          system: systemPrompt,
        },
        messages: [
          {
            role: 'user',
            content: `${message}`,
          },
        ],
        env: context.cloudflare?.env as any,
        apiKeys,
        providerSettings
      });

      return new Response(result.textStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: unknown) {
      console.log(error);

      if (error instanceof Error && error.message?.includes('API key')) {
        throw new Response('Invalid or missing API key', {
          status: 401,
          statusText: 'Unauthorized',
        });
      }

      throw new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  } else {
    try {
      const models = await getModelList({ apiKeys, providerSettings, serverEnv: context.cloudflare?.env as any });
      const modelDetails = models.find((m: ModelInfo) => m.name === model);

      if (!modelDetails) {
        throw new Error('Model not found');
      }

      const dynamicMaxTokens = modelDetails && modelDetails.maxTokenAllowed ? modelDetails.maxTokenAllowed : MAX_TOKENS;

      const providerInfo = PROVIDER_LIST.find((p) => p.name === provider.name);

      if (!providerInfo) {
        throw new Error('Provider not found');
      }

      logger.info(`Generating response Provider: ${provider.name}, Model: ${modelDetails.name}`);
      logger.info(`Messages:` + `System: ${systemPrompt}` + `User message: ${message}`);

//       return new Response(JSON.stringify({
//         text: `<selection>
//   <templateName>vite-react-app</templateName>
//   <title>Simple React todo application</title>
// </selection>`
//       }),
//       {
//         status: 200,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       }
//     );

      const result = await generateText({
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${message}`,
          },
        ],
        model: providerInfo.getModelInstance({
          model: modelDetails.name,
          serverEnv: context.cloudflare?.env as any,
          apiKeys,
          providerSettings,
        }),
        maxTokens: dynamicMaxTokens,
        toolChoice: 'none',
      });
      logger.info(`Generated response`);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: unknown) {
      console.log(error);

      if (error instanceof Error && error.message?.includes('API key')) {
        throw new Response('Invalid or missing API key', {
          status: 401,
          statusText: 'Unauthorized',
        });
      }

      throw new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  }
}
