import  { type LogProcessor } from '~/lib/aimpactshell/logsProcessors/logProcessor';
import { getPortCatcher, type PreviewPortCatcher } from '~/utils/previewPortCatcher';

export class LogPortCatcher implements LogProcessor {
  private portCatcher: PreviewPortCatcher;

  constructor(portCatcher: PreviewPortCatcher) {
    this.portCatcher = portCatcher;
  }

  process(log: string): void {
    const extractedPort = log.match(/http:\/\/localhost:(\d+)/)?.[1];
    if (extractedPort) {
      const portNumber = Number(extractedPort);
      if (!isNaN(portNumber)) {
        this.portCatcher.putNewPort(portNumber);
      } else {
        console.warn(`Invalid port number extracted: ${extractedPort}`);
      }
    }
  }
}
