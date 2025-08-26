import  { type LogProcessor } from '~/lib/aimpactshell/logsProcessors/logProcessor';
import { getPortCatcher, type PortCatcher } from '~/utils/portCatcher';

export class LogPortCatcher implements LogProcessor {
  private portCatcher: PortCatcher;

  constructor(portCatcher: PortCatcher) {
    this.portCatcher = getPortCatcher();
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
