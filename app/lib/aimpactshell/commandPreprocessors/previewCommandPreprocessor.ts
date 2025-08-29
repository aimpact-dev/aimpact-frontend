import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { workbenchStore } from '~/lib/stores/workbench';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { path } from '~/utils/path';
import { PREVIEW_COMMANDS } from '~/lib/aimpactshell/commandPreprocessors/commandsLists';


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
    if (!PREVIEW_COMMANDS.includes(command.trim())) return Promise.resolve(command);

    const fs = await this.aimpactFs;
    const workdir = await fs.workdir();


    const scriptContent = await loadContentFromScripts(REPORTER_SCRIPT_FILE_NAME);
    const scriptContentWithOrigin = addOriginToReporterScript(scriptContent);
    await fs.writeFile(REPORTER_SCRIPT_FILE_NAME, scriptContentWithOrigin);
    workbenchStore.pendLockForFile(path.join(workdir, REPORTER_SCRIPT_FILE_NAME));

    const pluginContent = await loadContentFromScripts(REPORTER_PLUGIN_FILE_NAME);
    await fs.writeFile(REPORTER_PLUGIN_FILE_NAME, pluginContent);
    workbenchStore.pendLockForFile(path.join(workdir, REPORTER_PLUGIN_FILE_NAME));

    try{
      const viteConfigFile = await fs.readFile(path.join(workdir, VITE_CONFIG_FILE), 'utf-8');
      const modifiedViteConfig = injectPluginIntoViteConfigBabel(viteConfigFile);
      await fs.writeFile(VITE_CONFIG_FILE, modifiedViteConfig);
    }
    catch (e){
      console.warn('Could not add error reporter plugin to vite config..');
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
  const ast = parse(viteConfigContent, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  let hasImport = false;
  let pluginAdded = false;

  traverse(ast, {
    ImportDeclaration(path) {
      if (
        path.node.source.value === REPORTER_PLUGIN_FILE_NAME &&
        path.node.specifiers.some(
          s => t.isImportSpecifier(s) && s.imported.name === REPORTER_PLUGIN_NAME
        )
      ) {
        hasImport = true;
      }
    },
    Program: {
      exit(path) {
        if (!hasImport) {
          const importDecl = t.importDeclaration(
            [t.importSpecifier(t.identifier(REPORTER_PLUGIN_NAME), t.identifier(REPORTER_PLUGIN_NAME))],
            t.stringLiteral("./" + REPORTER_PLUGIN_FILE_NAME)
          );
          path.node.body.unshift(importDecl);
        }
      }
    },
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
              t.isIdentifier(el.callee, { name: REPORTER_PLUGIN_NAME })
          );
          if (!alreadyPresent) {
            pluginsArray.elements.push(
              t.callExpression(t.identifier(REPORTER_PLUGIN_NAME), [])
            );
            pluginAdded = true;
          }
        }
      }
    }
  });

  const output = generate(ast, { retainLines: true }).code;
  return output;
}

async function loadContentFromScripts(fileName: string): Promise<string>{
  const response = await fetch(`/scripts/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load script: ${fileName}`);
  }
  return response.text();
}
