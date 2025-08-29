import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';
import { PreviewPortCatcher } from '~/utils/previewPortCatcher';
import { PREVIEW_COMMANDS } from '~/lib/aimpactshell/commandPreprocessors/commandsLists';
import type { SessionExecuteRequest } from '@daytonaio/api-client';

/**
 * This class memorizes the last command that went through it.
 * If the last command was a preview command, then this class will kill the process running on the preview port.
 */
export class PreviewKillPreprocessor implements CommandPreprocessor  {
  private sandboxPromise: Promise<AimpactSandbox>;
  private lastCommand: string;
  private portCatcher: PreviewPortCatcher;

  constructor(sandboxPromise: Promise<AimpactSandbox>, portCatcher: PreviewPortCatcher) {
    this.sandboxPromise = sandboxPromise;
    this.lastCommand = '';
    this.portCatcher = portCatcher;
  }

  async process(command: string): Promise<string> {
    // If the last command started a preview process, then we need to kill it before running the new command.
    if(PREVIEW_COMMANDS.includes(this.lastCommand) || PREVIEW_COMMANDS.includes(command)) {
      const sandbox = await this.sandboxPromise;
      const port = this.portCatcher.getPort();
      if(port){
        try {
          console.log("Killing preview on port " + port);
          const killSessionName = 'kill-session';
          await sandbox.createSession(killSessionName);
          const killCommand: SessionExecuteRequest = {
            //This command finds the process running on the given port, retrieves its PID, and kills it.
            command: `netstat -tulpn | grep :${port} | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9`,
            runAsync: false
          }
          const killResult = await sandbox.executeSessionCommand(killSessionName, killCommand);
          console.log("Kill result:", killResult);
          await sandbox.deleteSession(killSessionName);
          this.portCatcher.removePort();
        }
        catch (e) {
          console.error('Failed to kill port ' + port, e);
        }
      }
    }
    this.lastCommand = command;
    return Promise.resolve(command);
  }
}
