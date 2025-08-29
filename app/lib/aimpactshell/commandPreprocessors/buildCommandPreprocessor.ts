import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { path } from '~/utils/path';
import {
  REPORTER_PLUGIN_FILE_NAME, REPORTER_PLUGIN_NAME,
  REPORTER_SCRIPT_FILE_NAME, VITE_CONFIG_FILE
} from '~/lib/aimpactshell/commandPreprocessors/constants';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

export const BUILD_COMMANDS: string[] = [
  'pnpm run build',
  'npm run build',
]

/**
 * This class is responsible for deleting error reporting related files, created by PreviewCommandPreprocessor.
 * It also removes the reporting plugin from the vite config.
 */
export class BuildCommandPreprocessor implements CommandPreprocessor {
  private aimpactFs: Promise<AimpactFs>;

  constructor(aimpactFs: Promise<AimpactFs>) {
    this.aimpactFs = aimpactFs;
  }

  async process(command: string): Promise<string> {
    console.log(`Processing ${command}`);
    if(!BUILD_COMMANDS.includes(command.trim())) return Promise.resolve(command);

    const fs = await this.aimpactFs;
    const workdir = await fs.workdir();

    //Removing script and plugin files
    await this.removeFile(path.join(workdir, REPORTER_SCRIPT_FILE_NAME));
    await this.removeFile(path.join(workdir, REPORTER_PLUGIN_FILE_NAME));

    try{
      const viteConfigFile = await fs.readFile(path.join(workdir, VITE_CONFIG_FILE), 'utf-8');
      const modifiedViteConfig = this.removePluginFromViteConfig(viteConfigFile);
      await fs.writeFile(VITE_CONFIG_FILE, modifiedViteConfig);
    }
    catch (e){
      console.warn('Could not add error reporter plugin to vite config..');
      return Promise.resolve(command);
    }

    return Promise.resolve(command);
  }

  private removePluginFromViteConfig(viteConfigContent: string): string{
    const ast = parse(viteConfigContent, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    traverse(ast, {
      CallExpression(path) {
        if (
          t.isIdentifier(path.node.callee, { name: 'defineConfig' }) &&
          path.node.arguments.length > 0 &&
          t.isObjectExpression(path.node.arguments[0])
        ) {
          const configObj = path.node.arguments[0] as t.ObjectExpression;
          const pluginsProp = configObj.properties.find(
            prop =>
              t.isObjectProperty(prop) &&
              t.isIdentifier(prop.key, { name: 'plugins' }) &&
              t.isArrayExpression(prop.value)
          ) as t.ObjectProperty | undefined;

          if (pluginsProp && t.isArrayExpression(pluginsProp.value)) {
            const pluginsArray = pluginsProp.value;
            pluginsArray.elements = pluginsArray.elements.filter(
              el =>
                !(
                  t.isCallExpression(el) &&
                  t.isIdentifier(el.callee, { name: REPORTER_PLUGIN_NAME })
                )
            );
          }
        }
      }
    });

    const output = generate(ast, { retainLines: true }).code;
    return output;
  }

  private async removeFile(filePath: string): Promise<void> {
    const fs = await this.aimpactFs;
    try {
      await fs.rm(filePath);
    } catch (e) {
      console.error(`Could not remove file ${filePath} while processing build command:`, e);
    }
  }
}
