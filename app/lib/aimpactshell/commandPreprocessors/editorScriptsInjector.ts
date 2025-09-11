import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { workbenchStore } from '~/lib/stores/workbench';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { path } from '~/utils/path';
import { PREVIEW_COMMANDS } from '~/lib/aimpactshell/commandPreprocessors/commandsLists';
import {
  EVENTS_PLUGIN_FILE_NAME,
  EVENTS_PLUGIN_NAME,
  EVENTS_SCRIPT_FILE_NAME,
  VITE_CONFIG_FILE
} from './constants';


export class EditorScriptsInjector implements CommandPreprocessor {
  private aimpactFs: Promise<AimpactFs>;

  constructor(aimpactFs: Promise<AimpactFs>) {
    this.aimpactFs = aimpactFs;
  }

  async process(command: string): Promise<string> {
    if (!PREVIEW_COMMANDS.includes(command.trim())) return Promise.resolve(command);

    const fs = await this.aimpactFs;
    const workdir = await fs.workdir();


    const scriptContent = await loadContentFromScripts(EVENTS_SCRIPT_FILE_NAME);
    const scriptContentWithOrigin = addOriginToReporterScript(scriptContent);
    await fs.writeFile(EVENTS_SCRIPT_FILE_NAME, scriptContentWithOrigin);
    workbenchStore.pendLockForFile(path.join(workdir, EVENTS_SCRIPT_FILE_NAME));

    const pluginContent = await loadContentFromScripts(EVENTS_PLUGIN_FILE_NAME);
    await fs.writeFile(EVENTS_PLUGIN_FILE_NAME, pluginContent);
    workbenchStore.pendLockForFile(path.join(workdir, EVENTS_PLUGIN_FILE_NAME));

    try{
      const viteConfigFile = await fs.readFile(path.join(workdir, VITE_CONFIG_FILE), 'utf-8');
      const modifiedViteConfig = injectPluginIntoViteConfigBabel(viteConfigFile);
      await fs.writeFile(VITE_CONFIG_FILE, modifiedViteConfig);
    }
    catch (e){
      console.warn('Could not add error reporter plugin to vite config..', e);
      return Promise.resolve(command);
    }
    return Promise.resolve(command);
  }
}

function addOriginToReporterScript(scriptContent: string): string{
  const origin = window.location.origin;
  return scriptContent.replaceAll('"*"', `"${origin}"`);
}

function injectPluginIntoViteConfigBabel(viteConfigContent: string): string {
  //Remove plugin import via string replacement to avoid duplicates
  viteConfigContent = removePluginImports(viteConfigContent);
  const ast = parse(viteConfigContent, {
    sourceType: 'module',
    plugins: ['typescript'],
    strictMode: false,
  });

  traverse(ast, {
    Program: {
      //Add plugin import at the top of the file
      exit(path) {
        const importDecl = t.importDeclaration(
          [t.importSpecifier(t.identifier(EVENTS_PLUGIN_NAME), t.identifier(EVENTS_PLUGIN_NAME))],
          t.stringLiteral("./" + EVENTS_PLUGIN_FILE_NAME)
        );
        path.node.body.unshift(importDecl);
      }
    },
    //Add plugin to defineConfig call if not already present
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
          const alreadyPresent = pluginsArray.elements.some(
            el =>
              t.isCallExpression(el) &&
              t.isIdentifier(el.callee, { name: EVENTS_PLUGIN_NAME })
          );
          if (!alreadyPresent) {
            pluginsArray.elements.push(
              t.callExpression(t.identifier(EVENTS_PLUGIN_NAME), [])
            );
          }
        }
      }
    }
  });

  return generate(ast).code;
}

function removePluginImports(viteConfigContent: string): string{
  const importRegex = new RegExp(
    `import\\s+(?:\\{\\s*${EVENTS_PLUGIN_NAME}\\s*\\}|${EVENTS_PLUGIN_NAME})\\s+from\\s+['"]\\./${EVENTS_PLUGIN_FILE_NAME}(?:\\.js)?['"];?\\s*`,
    'g'
  );
  return viteConfigContent.replace(importRegex, '');
}

async function loadContentFromScripts(fileName: string): Promise<string>{
  const response = await fetch(`/scripts/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load script: ${fileName}`);
  }
  return response.text();
}
