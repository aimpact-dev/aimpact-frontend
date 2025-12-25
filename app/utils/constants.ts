import { LLMManager } from '~/lib/modules/llm/manager';
import type { Template } from '~/types/template';
import rawSnapshotsData from '~/template/snapshot.json';
import type { SaveFileMap } from '~/lib/stores/files';

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
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
export const DEFAULT_MINI_MODEL = 'openai/gpt-5-mini';
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
    tags: ['typescript', 'vite', 'react'],
    icon: 'i-bolt:react',
    files: snapshotsData['vite-react-app'].files,
  },
  {
    name: 'dapp-scaffold-main',
    label: ' NextJS + Typescript',
    description: `Solana dApp Scaffold:
  - Next.js (TypeScript)
  - The Home screen imports and uses <GameSandbox />.
  - At the bottom of my file I have:

  const GameSandbox: FC = () => {
    return (
      <div>
        Your No-Code Jam Game
      </div>
    );
  };

  I need you to REPLACE ONLY that GameSandbox component
  with a fully working mini-game using React + Tailwind CSS.

  Rules:
  • Keep the function name and type EXACTLY:
    const GameSandbox: FC = () => { ... }
  • Do NOT add any new imports.
  • Do NOT change HomeView or anything else in the file.
  • Use only React hooks (like useState) and Tailwind classes.
  • Must compile in a Next.js + TypeScript project.
  • Must fit inside a vertical phone card (9:16 ratio).
  • Must show a SCORE.
  • Must have a clear GAME OVER or WIN condition.
  • Must have a RESTART button.
  • Must be playable with mouse or touch (click / tap).
  • No external libraries, no canvas, no backend, no wallet logic.
`,
    tags: ['typescript', 'vite', 'nextjs'],
    icon: 'i-bolt:react',
    files: snapshotsData['dapp-scaffold-main'].files,
  },
  {
    name: 'vite-threejs-app',
    label: 'Vite + Threejs + Typescript',
    description: 'Threejs + Tailwind starter template powered by Vite for fast development experience',
    tags: ['typescript', 'vite', 'threejs', '3d'],
    icon: 'i-bolt:react',
    files: snapshotsData['vite-threejs-app'].files,
  },
  {
    name: 'vite-solana-app',
    label: 'Vite + Solana + React + Typescript',
    description:
      'Solana blockchain development with React + TypeScript + Vite + Tailwind for building Web3 applications. Use this, if user wants to use smart contracts',
    tags: ['typescript', 'vite', 'react', 'solana', 'blockchain', 'web3', 'anchor', 'dapp'],
    icon: 'i-bolt:react',
    files: snapshotsData['vite-solana-app'].files,
  },
  {
    name: 'vite-solana-convex-app',
    label: 'Vite + Solana + React + Convex + Typescript',
    description:
      'Solana blockchain with Convex backend + Frontend with React and Vite. Convex backend have configured x402 framework. Use this template if user wants to sell paid content or use any other paid content powered by x402.\n' +
      'About x402: it is an open, blockchain payment protocol developed by Coinbase that revitalizes the HTTP 402 status code to enable automatic micropayments. It allows APIs to programmatically pay for access to services with USDC (Solana) without complex authentication.',
    tags: ['typescript', 'vite', 'react', 'web3', 'blockchain', 'achor', 'dapp', 'payments', 'x402'],
    icon: 'i-bolt:react',
    files: snapshotsData['vite-solana-convex-app'].files,
  },
];
