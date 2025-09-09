import type { LogProcessor } from '~/lib/aimpactshell/logsProcessors/logProcessor';
import { workbenchStore } from '~/lib/stores/workbench';

export class ViteTerminalErrorProcessor implements LogProcessor {
  process(log: string): void {
    const logsParts = log.split('\n');
    for (const part of logsParts) {
      const foundError = part.toLowerCase().includes('error');
      const foundVite = part.toLowerCase().includes('[vite]');
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
}
