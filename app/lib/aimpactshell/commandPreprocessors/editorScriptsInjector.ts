import { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
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
  NEXT_CONFIG_FILE,
  VITE_CONFIG_FILE,
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

    const vitePath = path.join(workdir, VITE_CONFIG_FILE);
    const nextPathJs = path.join(workdir, NEXT_CONFIG_FILE);

    if (await fs.fileExists(vitePath)) {
      await this.patchConfig(fs, vitePath, injectPluginIntoViteConfigBabel);
    } else if (await fs.fileExists(nextPathJs)) {
      await this.patchConfig(fs, nextPathJs, injectPluginIntoNextConfigBabel);
    }

    return Promise.resolve(command);
  }

  private async patchConfig(fs: AimpactFs, filePath: string, patchFn: (c: string) => string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const modified = patchFn(content);
      await fs.writeFile(path.basename(filePath), modified);
    } catch (e) {
      console.warn(`Could not patch ${filePath}`, e);
    }
  }
}

function injectPluginIntoNextConfigBabel(content: string): string {
  content = removePluginImports(content);
  const ast = parse(content, { sourceType: 'module', plugins: ['typescript'], strictMode: false });

  let injectedImport = false;
  traverse(ast, {
    Program: {
      exit(p) {
        if (!injectedImport) {
          const importDecl = t.importDeclaration(
            [t.importSpecifier(t.identifier(EVENTS_PLUGIN_NAME), t.identifier(EVENTS_PLUGIN_NAME))],
            t.stringLiteral('./' + EVENTS_PLUGIN_FILE_NAME),
          );
          p.node.body.unshift(importDecl);
          injectedImport = true;
        }
      },
    },
    ExportDefaultDeclaration(p) {
      const decl = p.node.declaration;
      const isWrapped = t.isCallExpression(decl) && t.isIdentifier(decl.callee, { name: EVENTS_PLUGIN_NAME });
      if (!isWrapped && t.isExpression(decl)) {
        p.node.declaration = t.callExpression(t.identifier(EVENTS_PLUGIN_NAME), [decl]);
      }
    },
    AssignmentExpression(p) {
      if (
        t.isMemberExpression(p.node.left) &&
        t.isIdentifier(p.node.left.object, { name: 'module' }) &&
        t.isIdentifier(p.node.left.property, { name: 'exports' })
      ) {
        const right = p.node.right;
        const isWrapped = t.isCallExpression(right) && t.isIdentifier(right.callee, { name: EVENTS_PLUGIN_NAME });

        // Convert module.exports = X to export default X
        const exportDecl = t.exportDefaultDeclaration(
          isWrapped
            ? (right as t.Expression)
            : t.callExpression(t.identifier(EVENTS_PLUGIN_NAME), [right as t.Expression]),
        );

        if (p.parentPath.isExpressionStatement()) {
          p.parentPath.replaceWith(exportDecl);
        }
      }
    },
  });

  return generate(ast).code;
}

function addOriginToReporterScript(scriptContent: string): string {
  const origin = window.location.origin;
  return scriptContent.replaceAll('"*"', `"${origin}"`);
}

function injectPluginIntoViteConfigBabel(viteConfigContent: string): string {
  viteConfigContent = removePluginImports(viteConfigContent);
  const ast = parse(viteConfigContent, {
    sourceType: 'module',
    plugins: ['typescript'],
    strictMode: false,
  });

  traverse(ast, {
    Program: {
      exit(p) {
        const importDecl = t.importDeclaration(
          [t.importSpecifier(t.identifier(EVENTS_PLUGIN_NAME), t.identifier(EVENTS_PLUGIN_NAME))],
          t.stringLiteral('./' + EVENTS_PLUGIN_FILE_NAME),
        );
        p.node.body.unshift(importDecl);
      },
    },
    CallExpression(p) {
      if (
        t.isIdentifier(p.node.callee, { name: 'defineConfig' }) &&
        p.node.arguments.length > 0 &&
        t.isObjectExpression(p.node.arguments[0])
      ) {
        const configObj = p.node.arguments[0] as t.ObjectExpression;
        const pluginsProp = configObj.properties.find(
          (prop) =>
            t.isObjectProperty(prop) &&
            t.isIdentifier(prop.key, { name: 'plugins' }) &&
            t.isArrayExpression(prop.value),
        ) as t.ObjectProperty | undefined;

        if (pluginsProp && t.isArrayExpression(pluginsProp.value)) {
          const pluginsArray = pluginsProp.value;
          const alreadyPresent = pluginsArray.elements.some(
            (el) => t.isCallExpression(el) && t.isIdentifier(el.callee, { name: EVENTS_PLUGIN_NAME }),
          );
          if (!alreadyPresent) {
            pluginsArray.elements.push(t.callExpression(t.identifier(EVENTS_PLUGIN_NAME), []));
          }
        }
      }
    },
  });

  return generate(ast).code;
}

function removePluginImports(content: string): string {
  const regex = new RegExp(
    `import\\s+(?:\\{\\s*${EVENTS_PLUGIN_NAME}\\s*\\}|${EVENTS_PLUGIN_NAME})\\s+from\\s+['"]\\./${EVENTS_PLUGIN_FILE_NAME}(?:\\.js)?['"];?\\s*`,
    'g',
  );
  return content.replace(regex, '');
}

async function loadContentFromScripts(fileName: string): Promise<string> {
  const response = await fetch(`/scripts/${fileName}`);
  if (!response.ok) throw new Error(`Failed to load script: ${fileName}`);
  return response.text();
}
