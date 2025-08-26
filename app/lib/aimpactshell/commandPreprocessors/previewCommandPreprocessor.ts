import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';

const PREVIEW_COMMANDS = [
  'pnpm run dev',
  'npm run dev',
  'pnpm run vite',
  'npm run vite',
];

const REPORTER_SCRIPT_FILE_NAME = 'runtimeErrorReporterScript.js';
const REPORTER_PLUGIN_FILE_NAME = 'runtimeErrorReporterPlugin.js';
const REPORTER_PLUGIN_METHOD = 'runtimeErrorReporterPlugin()';

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
    const scriptExists = await fs.fileExists(REPORTER_SCRIPT_FILE_NAME);
    const pluginExists = await fs.fileExists(REPORTER_PLUGIN_FILE_NAME);
    console.log(`Reporter script exists: ${scriptExists}, plugin exists: ${pluginExists}`);
    return Promise.resolve(command);
  }
}
