import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';

const PREVIEW_COMMANDS = [
  'pnpm run dev',
  'npm run dev',
  'pnpm run vite',
  'npm run vite',
];

export class PreviewCommandPreprocessor implements CommandPreprocessor {
  private aimpactFs: Promise<AimpactFs>;

  constructor(aimpactFs: Promise<AimpactFs>) {
    this.aimpactFs = aimpactFs;
  }

  async process(command: string): Promise<string> {
    if (PREVIEW_COMMANDS.includes(command.trim())) {
      console.log("Preview command detected: ", command);
    }
    const fs = await this.aimpactFs;
    return Promise.resolve(command);
  }
}
