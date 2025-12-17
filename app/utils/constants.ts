import type { SaveFileMap } from '~/lib/stores/files';

interface Snapshot {
  files: SaveFileMap;
  chatIndex?: string;
  summary?: string;
}

export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'bolt_file_modifications';
export const MODEL_REGEX = /^\[Model: (.*?)\]\n\n/;
export const PROVIDER_REGEX = /\[Provider: (.*?)\]\n\n/;
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
export const DEFAULT_MINI_MODEL = 'openai/gpt-5-mini';
export const DEFAULT_PROVIDER_NAME = 'OpenRouter';
export const DEFAULT_MINI_PROVIDER_NAME = 'OpenRouter';
export const PROMPT_COOKIE_KEY = 'cachedPrompt';
