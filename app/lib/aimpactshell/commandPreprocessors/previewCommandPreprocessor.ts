import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { workbenchStore } from '~/lib/stores/workbench';


const PREVIEW_COMMANDS = [
  'pnpm run dev',
  'npm run dev',
  'pnpm run vite',
  'npm run vite',
];

const REPORTER_SCRIPT_FILE_NAME = 'runtimeErrorReporterScript.js';
const REPORTER_PLUGIN_FILE_NAME = 'runtimeErrorReporterPlugin.js';
const REPORTER_PLUGIN_METHOD = 'runtimeErrorReporterPlugin()';
const REPORTER_PLUGIN_NAME = 'runtimeErrorReporterPlugin';
const VITE_CONFIG_FILE = 'vite.config.ts';

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
    const workdir = await fs.workdir();


    const scriptContent = await loadContentFromScripts(REPORTER_SCRIPT_FILE_NAME);
    await fs.writeFile(REPORTER_SCRIPT_FILE_NAME, scriptContent);
    workbenchStore.pendLockForFile(workdir + '/' + REPORTER_SCRIPT_FILE_NAME);

    const pluginContent = await loadContentFromScripts(REPORTER_PLUGIN_FILE_NAME);
    await fs.writeFile(REPORTER_PLUGIN_FILE_NAME, pluginContent);
    workbenchStore.pendLockForFile(workdir + '/' + REPORTER_PLUGIN_FILE_NAME);

    console.log("Modifying Vite config to include reporter plugin if necessary.");
    try{
      const viteConfigFile = await fs.readFile(workdir + '/' + VITE_CONFIG_FILE, 'utf-8');
      const modifiedViteConfig = injectPluginIntoViteConfig(viteConfigFile);
      console.log("Modified Vite config content:\n", modifiedViteConfig);
      await fs.writeFile(VITE_CONFIG_FILE, modifiedViteConfig);
    }
    catch (e){
      console.warn('Vite config file not found, skipping its modification.');
      return Promise.resolve(command);
    }
    return Promise.resolve(command);
  }
}

function injectPluginIntoViteConfig(viteConfigContent: string): string {
  if (viteConfigContent.includes(REPORTER_PLUGIN_METHOD)) {
    return viteConfigContent; // Already present
  }
  const importStatement = `import { ${REPORTER_PLUGIN_NAME} } from './${REPORTER_PLUGIN_NAME}';`;
  if(!viteConfigContent.includes(importStatement)){
    viteConfigContent = importStatement + '\n' + viteConfigContent;
  }
  return viteConfigContent.replace(
    /(plugins\s*:\s*\[)([^]*?)(\])/,
    (match, start, plugins, end) => {
      // Insert before the closing bracket, after last plugin (handle trailing commas)
      console.log("Found plugins array in Vite config, injecting reporter plugin.");
      const trimmed = plugins.trim();
      const needsComma = trimmed && !trimmed.endsWith(',');
      return `${start}${plugins}${needsComma ? ',' : ''} ${REPORTER_PLUGIN_METHOD}${end}`;
    }
  );
}

async function loadContentFromScripts(fileName: string): Promise<string>{
  const response = await fetch(`/scripts/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load script: ${fileName}`);
  }
  return response.text();
}
