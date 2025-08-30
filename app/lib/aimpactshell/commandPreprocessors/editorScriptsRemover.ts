import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { path } from '~/utils/path';
import {
  EVENTS_PLUGIN_FILE_NAME, EVENTS_PLUGIN_NAME,
  EVENTS_SCRIPT_FILE_NAME, VITE_CONFIG_FILE
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
 * This class checks for build commands and deletes scripts that are only needed for editor functions (like previews).
 * It also removes injection of those scripts from user's production code (like Vite config).
 */
export class EditorScriptsRemover implements CommandPreprocessor {
  private aimpactFs: Promise<AimpactFs>;

  constructor(aimpactFs: Promise<AimpactFs>) {
    this.aimpactFs = aimpactFs;
  }

  async process(command: string): Promise<string> {
    if(!BUILD_COMMANDS.includes(command.trim())) return Promise.resolve(command);

    const fs = await this.aimpactFs;
    const workdir = await fs.workdir();

    //Removing script and plugin files
    await this.removeFile(path.join(workdir, EVENTS_SCRIPT_FILE_NAME));
    await this.removeFile(path.join(workdir, EVENTS_PLUGIN_FILE_NAME));

    const viteConfigFile = await fs.readFile(path.join(workdir, VITE_CONFIG_FILE), 'utf-8');
    let modifiedViteConfig = viteConfigFile;
    //Try to remove using Babel first, if it fails, try a simple string replacement
    try{
      modifiedViteConfig = this.removePluginFromViteConfig(viteConfigFile);
    }
    catch (e){
      console.warn('Could not remove editor plugin from vite config, trying fallback method..', e);
      try{
        modifiedViteConfig = this.removePluginFromViteConfigFallback(viteConfigFile);
      }
      catch (e){
        console.warn('Could not remove editor plugin from vite config using fallback method..');
      }
    }
    await fs.writeFile(VITE_CONFIG_FILE, modifiedViteConfig);

    return Promise.resolve(command);
  }

  private removePluginFromViteConfigFallback(viteConfigContent: string): string{
    const importStatementDoubleQuotes = `import ${EVENTS_PLUGIN_NAME} from "./${EVENTS_PLUGIN_FILE_NAME}";`;
    const importStatementSingleQuotes = `import ${EVENTS_PLUGIN_NAME} from './${EVENTS_PLUGIN_FILE_NAME}';`;
    const pluginUsage = `${EVENTS_PLUGIN_NAME}()`;
    viteConfigContent = viteConfigContent.replace(pluginUsage, '');
    viteConfigContent = viteConfigContent.replace(importStatementDoubleQuotes,  '');
    viteConfigContent = viteConfigContent.replace(importStatementSingleQuotes,  '');
    return viteConfigContent;
  }

  private removePluginFromViteConfig(viteConfigContent: string): string{
    const ast = parse(viteConfigContent, {
      sourceType: 'module',
      plugins: ['typescript'],
      strictMode: false,
    });

    traverse(ast, {
      ImportDeclaration(path) {
        // Remove plugin import
        const hasPluginImport = path.node.specifiers.some(spec =>
          (t.isImportDefaultSpecifier(spec) || t.isImportSpecifier(spec)) &&
          spec.local.name === EVENTS_PLUGIN_NAME
        );
        if (hasPluginImport) {
          path.remove();
        }
      },
      // Remove plugin usage in defineConfig
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
                  t.isIdentifier(el.callee, { name: EVENTS_PLUGIN_NAME })
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
