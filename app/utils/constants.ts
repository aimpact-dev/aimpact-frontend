import { LLMManager } from '~/lib/modules/llm/manager';
import type { Template } from '~/types/template';
import rawSnapshotsData from '~/template/snapshot.json';
import type { FileMap, SaveFileMap } from '~/lib/stores/files';

interface Snapshot {
  files: SaveFileMap;
  chatIndex?: string;
  summary?: string;
}

const snapshotsData = rawSnapshotsData as Record<string, Snapshot>;

export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'bolt_file_modifications';
export const MODEL_REGEX = /^\[Model: (.*?)\]\n\n/;
export const PROVIDER_REGEX = /\[Provider: (.*?)\]\n\n/;
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4';
export const DEFAULT_MINI_MODEL = 'openai/gpt-4.1-mini';
export const DEFAULT_PROVIDER_NAME = 'OpenRouter';
export const DEFAULT_MINI_PROVIDER_NAME = 'OpenRouter';
export const PROMPT_COOKIE_KEY = 'cachedPrompt';

const llmManager = LLMManager.getInstance(import.meta.env);

export const PROVIDER_LIST = llmManager.getAllProviders();
export const DEFAULT_PROVIDER =
  PROVIDER_LIST.find((p) => p.name === DEFAULT_PROVIDER_NAME) || llmManager.getDefaultProvider();
export const DEFAULT_MINI_PROVIDER =
  PROVIDER_LIST.find((p) => p.name === DEFAULT_MINI_PROVIDER_NAME) || llmManager.getDefaultProvider();

export const providerBaseUrlEnvKeys: Record<string, { baseUrlKey?: string; apiTokenKey?: string }> = {};
PROVIDER_LIST.forEach((provider) => {
  providerBaseUrlEnvKeys[provider.name] = {
    baseUrlKey: provider.config.baseUrlKey,
    apiTokenKey: provider.config.apiTokenKey,
  };
});

// starter Templates

export const STARTER_TEMPLATES: Template[] = [
  {
    name: 'vite-react-app',
    label: 'Vite + React + Typescript',
    description: 'React + Tailwind starter template powered by Vite for fast development experience',
    tags: ['typescript', 'vite', 'vitejs', 'react', 'website', 'app'],
    icon: 'i-bolt:react',
    files: snapshotsData['vite-react-app'].files,
  },
];
