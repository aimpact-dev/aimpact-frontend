import type { LogProcessor } from '~/lib/aimpactshell/logsProcessors/logProcessor';
import { workbenchStore } from '~/lib/stores/workbench';

export class MiscTerminalErrorProcessor implements LogProcessor {
  private hasErrorPattern(input: string): boolean {
    return /Error \[[A-Z_]+\]:/.test(input);
  }

  process(log: string): void {
    const logsParts = log.split('\n');
    for (const part of logsParts) {
      const foundError = this.hasErrorPattern(part);
      if (foundError) {
        workbenchStore.actionAlert.set (
          {
            type: 'error',
            title: 'Terminal error',
            description: `${part.slice(0, 100)}`,
            content: `${part}`,
            source: 'terminal'
          }
        );
      }
    }
  }
}
