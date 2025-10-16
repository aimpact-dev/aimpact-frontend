import ignore from "ignore";
import type { FileMap } from "~/lib/stores/files";

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yaml',
];

const defaultIgnore = ignore().add(IGNORE_PATTERNS);

export const filterIgnoreFiles = (workdir: string, files: FileMap) => {
  const filterFunc = ([key, value]: any) => {
    const relPath = key.replace(workdir, '');
    if (defaultIgnore.ignores(relPath)) return false;

    return true;
  }
  const filteredFiles = Object.fromEntries(Object.entries(files).filter(filterFunc));

  return filteredFiles;
}
