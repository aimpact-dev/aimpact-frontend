import type { LogProcessor } from '~/lib/aimpactshell/logsProcessors/logProcessor';
import { workbenchStore } from '~/lib/stores/workbench';

const VITE_SEARCH_PATTERN = '[vite]';

//If the error log contains any of these strings, then we can ignore it and not show the error message.
const IGNORE_PATTERNS = [
  'Pre-transform error: The file does not exist at "/home/daytona/node_modules/.vite/deps/chunk'
]

export class ViteTerminalErrorProcessor implements LogProcessor {
  process(log: string): void {
    const logsParts = log.split('\n');
    for (const part of logsParts) {
      const foundError = part.toLowerCase().includes('error');
      const foundVite = part.toLowerCase().includes(VITE_SEARCH_PATTERN);
      if(this.containsIgnorePattern(part)){
        continue;
      }
      if (foundError && foundVite) {
        workbenchStore.actionAlert.set (
          {
            type: 'error',
            title: 'Vite error in console',
            description: `${part.slice(0, 100)}`,
            content: `${part}`,
            source: 'terminal'
          }
        );
      }
    }

  }

  private containsIgnorePattern(part: string): boolean {
    for(const ignorePattern of IGNORE_PATTERNS) {
      if(part.includes(ignorePattern)) {
        return true;
      }
    }
    return false;
  }
}
