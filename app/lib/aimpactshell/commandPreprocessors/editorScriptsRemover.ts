import { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { path } from '~/utils/path';
import {
  EVENTS_PLUGIN_FILE_NAME,
  EVENTS_PLUGIN_NAME,
  EVENTS_SCRIPT_FILE_NAME,
  NEXT_CONFIG_FILE,
  VITE_CONFIG_FILE,
} from '~/lib/aimpactshell/commandPreprocessors/constants';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { BUILD_COMMANDS } from './commandsLists';

export class EditorScriptsRemover implements CommandPreprocessor {
  private aimpactFs: Promise<AimpactFs>;

  constructor(aimpactFs: Promise<AimpactFs>) {
    this.aimpactFs = aimpactFs;
  }

  async process(command: string): Promise<string> {
    if (!BUILD_COMMANDS.includes(command.trim())) return Promise.resolve(command);

    const fs = await this.aimpactFs;
    const workdir = await fs.workdir();

    await this.removeFile(path.join(workdir, EVENTS_SCRIPT_FILE_NAME));
    await this.removeFile(path.join(workdir, EVENTS_PLUGIN_FILE_NAME));

    const vitePath = path.join(workdir, VITE_CONFIG_FILE);
    if (await fs.fileExists(vitePath)) {
      await this.cleanConfig(fs, vitePath, (c) => this.removePluginFromViteConfig(c));
    }

    const nextPath = path.join(workdir, NEXT_CONFIG_FILE);
    if (await fs.fileExists(nextPath)) {
      await this.cleanConfig(fs, nextPath, (c) => this.removePluginFromNextConfig(c));
    }

    return Promise.resolve(command);
  }

  private async cleanConfig(fs: AimpactFs, filePath: string, cleaner: (content: string) => string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const modified = cleaner(content);
      await fs.writeFile(path.basename(filePath), modified);
    } catch (e) {
      console.warn(`Failed to clean config at ${filePath}`, e);
    }
  }

  private removePluginFromViteConfig(content: string): string {
    const ast = this.getAst(content);
    traverse(ast, {
      ImportDeclaration: (p) => this.removeImport(p),
      CallExpression: (p) => {
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
            pluginsProp.value.elements = pluginsProp.value.elements.filter(
              (el) => !(t.isCallExpression(el) && t.isIdentifier(el.callee, { name: EVENTS_PLUGIN_NAME })),
            );
          }
        }
      },
    });
    return generate(ast, { retainLines: true }).code;
  }

  private removePluginFromNextConfig(content: string): string {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript'],
      strictMode: false,
    });

    traverse(ast, {
      VariableDeclaration: (p) => {
        p.node.declarations.forEach((decl) => {
          if (
            t.isCallExpression(decl.init) &&
            t.isIdentifier(decl.init.callee, { name: 'require' }) &&
            t.isStringLiteral(decl.init.arguments[0]) &&
            decl.init.arguments[0].value.includes(EVENTS_PLUGIN_FILE_NAME)
          ) {
            p.remove();
          }
        });
      },

      ExportDefaultDeclaration(p) {
        while (
          t.isCallExpression(p.node.declaration) &&
          t.isIdentifier(p.node.declaration.callee, { name: EVENTS_PLUGIN_NAME })
        ) {
          p.node.declaration = p.node.declaration.arguments[0] as t.Expression;
        }
      },

      AssignmentExpression(p) {
        if (
          t.isMemberExpression(p.node.left) &&
          t.isIdentifier(p.node.left.object, { name: 'module' }) &&
          t.isIdentifier(p.node.left.property, { name: 'exports' })
        ) {
          while (
            t.isCallExpression(p.node.right) &&
            t.isIdentifier(p.node.right.callee, { name: EVENTS_PLUGIN_NAME })
          ) {
            p.node.right = p.node.right.arguments[0] as t.Expression;
          }
        }
      },
    });

    return generate(ast, { retainLines: true }).code;
  }

  private removeImport(path: any) {
    const hasPluginImport = path.node.specifiers.some(
      (spec: any) =>
        (t.isImportDefaultSpecifier(spec) || t.isImportSpecifier(spec)) && spec.local.name === EVENTS_PLUGIN_NAME,
    );
    if (hasPluginImport) path.remove();
  }

  private getAst(content: string) {
    return parse(content, {
      sourceType: 'module',
      plugins: ['typescript'],
      strictMode: false,
    });
  }

  private async removeFile(filePath: string): Promise<void> {
    const fs = await this.aimpactFs;
    try {
      if (await fs.fileExists(filePath)) {
        await fs.rm(filePath);
      }
    } catch (e) {
      console.error(`Error removing ${filePath}:`, e);
    }
  }
}
