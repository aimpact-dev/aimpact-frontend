import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';

const PREVIEW_COMMANDS = [
  'pnpm run dev',
  'npm run dev',
  'pnpm run vite',
  'npm run vite',
];

export class PreviewCommandPreprocessor implements CommandPreprocessor {
  process(command: string): Promise<string> {
    if (PREVIEW_COMMANDS.includes(command.trim())) {
      console.log("Preview command detected: ", command);
    }
    return Promise.resolve(command);
  }
}
