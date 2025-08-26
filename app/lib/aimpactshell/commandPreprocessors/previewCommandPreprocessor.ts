import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import path from 'path';
import fs from 'fs/promises';

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
    if (!scriptExists) {
      const scriptContent = await loadContentFromScripts(REPORTER_SCRIPT_FILE_NAME);
      await fs.writeFile(REPORTER_SCRIPT_FILE_NAME, scriptContent);
    }
    const pluginExists = await fs.fileExists(REPORTER_PLUGIN_FILE_NAME);
    if (!pluginExists) {
      const pluginContent = await loadContentFromScripts(REPORTER_PLUGIN_FILE_NAME);
      await fs.writeFile(REPORTER_PLUGIN_FILE_NAME, pluginContent);
    }
    return Promise.resolve(command);
  }
}

async function loadContentFromScripts(fileName: string): Promise<string>{
  const response = await fetch(`/scripts/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load script: ${fileName}`);
  }
  return response.text();
}
