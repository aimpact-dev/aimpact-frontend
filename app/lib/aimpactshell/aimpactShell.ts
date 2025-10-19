import type { ITerminal } from '~/types/terminal';
import { v4 as uuidv4 } from 'uuid';
import { coloredText } from '~/utils/terminal';
import { getPortCatcher } from '~/utils/previewPortCatcher';
import { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';
import type { CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import { LogPortCatcher } from '~/lib/aimpactshell/logsProcessors/logPortCatcher';
import { EditorScriptsInjector } from '~/lib/aimpactshell/commandPreprocessors/editorScriptsInjector';
import type { LogProcessor } from '~/lib/aimpactshell/logsProcessors/logProcessor';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { PreviewKillPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/previewKillPreprocessor';
import { EditorScriptsRemover } from '~/lib/aimpactshell/commandPreprocessors/editorScriptsRemover';
import { RuntimeErrorProcessor } from '~/lib/aimpactshell/logsProcessors/runtimeErrorProcessor';
import { CommandBuffer } from '~/lib/aimpactshell/commandBuffer';
import { ViteConfigSyntaxChecker } from '~/lib/aimpactshell/commandPreprocessors/viteConfigSyntaxChecker';
import { ViteTerminalErrorProcessor } from '~/lib/aimpactshell/logsProcessors/viteTerminalErrorProcessor';
import { MiscTerminalErrorProcessor } from '~/lib/aimpactshell/logsProcessors/miscTerminalErrorProcessor';

export type ExecutionResult = { output: string; exitCode: number } | undefined;

export class AimpactShell {
  private terminal: ITerminal | undefined;
  private readonly sandboxPromise: Promise<AimpactSandbox>;

  // Handles terminal input processing, including tracking ITerminal onData events and managing command input.
  private commandBuffer: CommandBuffer;

  //State of the currently executing command. undefined if no command is running.
  private executionState:
    | {
        sessionId: string;
        commandId: string;
        executionPromise: Promise<ExecutionResult>;
        abort?: () => void;
      }
    | undefined;
  //Some commands are long running, so the only way to check their execution state is to poll them periodically.
  private commandPollingInterval: number = 1000;
  private lastLogLength: number = 0;

  //Every time we receive a new log, we pass it to these functions.
  //May be useful for retrieving information from the logs.
  private readonly logsProcessors: LogProcessor[] = [];

  private readonly commandPreprocessors: CommandPreprocessor[] = [];

  constructor(
    sandboxPromise: Promise<AimpactSandbox>,
    logsProcessors: LogProcessor[] = [],
    commandPreprocessors: CommandPreprocessor[] = [],
  ) {
    this.logsProcessors = logsProcessors;
    this.sandboxPromise = sandboxPromise;
    this.commandPreprocessors = commandPreprocessors;
    if (!sandboxPromise) {
      console.log('Sandbox is undefined');
    }

    this.commandBuffer = new CommandBuffer(async (command) => {
      await this.executeCommand(command);
    });
  }

  setTerminal(terminal: ITerminal) {
    this.terminal = terminal;
    this.commandBuffer.setTerminal(terminal);
  }

  async executeCommand(command: string, abort?: () => void): Promise<ExecutionResult> {
    const sandbox = await this.sandboxPromise;
    if (this.executionState) {
      console.log('Execution state is already set, aborting previous command.');
      //Some command is currently running, we need to abort it first.
      if (this.executionState.abort) {
        this.executionState.abort();
      }
      //Currently there is no way to kill running process in Daytona.io API,
      //so we delete the session instead.
      console.log('Deleting session:', this.executionState.sessionId);
      await sandbox.deleteSession(this.executionState.sessionId);
      //Wait for previous command to finish executing.
      await this.executionState.executionPromise;
    }

    //We create a new session for each new command.
    const sessionId = uuidv4();
    await sandbox.createSession(sessionId);

    const commandRequest = {
      command: command,
      runAsync: true, //If you run something like 'npm run dev' in sync mode you will wait for it forever.
    };
    //Before executing the command, we pass it through all preprocessors.
    for (const preprocessor of this.commandPreprocessors) {
      commandRequest.command = await preprocessor.process(commandRequest.command);
    }

    console.log('Executing command: ', commandRequest.command, 'in session:', sessionId);
    const response = await sandbox.executeSessionCommand(sessionId, commandRequest);
    const commandId = response.cmdId;
    const executionPromise = this._pollCommandState(sessionId, commandId!);
    this.executionState = {
      sessionId: sessionId,
      commandId: commandId!,
      executionPromise: executionPromise,
      abort: abort, // Allow to abort the command
    };

    return await executionPromise;
  }

  //This method periodically checks the currently running command state, takes the logs
  //and outputs new logs to the ITerminal instance.
  async _pollCommandState(sessionId: string, commandId: string): Promise<ExecutionResult> {
    const sandbox = await this.sandboxPromise;
    try {
      while (true) {
        const commandState = await sandbox.getSessionCommand(sessionId, commandId);
        const commandLogs = await sandbox.getSessionCommandLogs(sessionId, commandId);
        //We need to output new logs to the terminal.
        //These have to be new logs only, so we keep track of the last log length.
        if (commandLogs) {
          let newLogs = commandLogs.slice(this.lastLogLength);
          if (newLogs) {
            //Feed new logs to the logs processors.
            for (const logsProcessor of this.logsProcessors) {
              logsProcessor.process(newLogs);
            }
            if (commandState.exitCode !== undefined && commandState.exitCode !== 0) {
              newLogs = coloredText.red(newLogs);
            }
            this.terminal?.write(newLogs);
          }
          this.lastLogLength = commandLogs.length;
        }
        if (commandState.exitCode !== undefined) {
          console.log(
            'Received exit code for command:',
            commandState.exitCode,
            'in session:',
            sessionId,
            'command:',
            commandId,
          );
          console.log('Cleaning up session:', sessionId, 'after command execution.');
          //If command finished running, then we need to delete its session
          await sandbox.deleteSession(sessionId);
          //Reset the execution state
          this.executionState = undefined;
          this.lastLogLength = 0;
          return {
            output: cleanTerminalOutput(commandLogs),
            exitCode: commandState.exitCode,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, this.commandPollingInterval));
      }
    } catch (e) {
      console.error('Error polling command state:', e);
      this.executionState = undefined;
      this.lastLogLength = 0;
      return undefined;
    }
  }
}

//Using this function for creating a new AimpactShell instance is preferable, because it attaches
//log processor for capturing preview port from Daytona.io server.
export function newAimpactShellProcess(
  sandboxPromise: Promise<AimpactSandbox>,
  fsPromise: Promise<AimpactFs>,
): AimpactShell {
  const portCatcher = getPortCatcher();
  const logsProcessors = [
    new LogPortCatcher(portCatcher),
    new ViteTerminalErrorProcessor(),
    new MiscTerminalErrorProcessor(),
  ];
  const commandsPreprocessors: CommandPreprocessor[] = [
    new ViteConfigSyntaxChecker(fsPromise),
    new PreviewKillPreprocessor(sandboxPromise, portCatcher),
    new EditorScriptsInjector(fsPromise),
    new EditorScriptsRemover(fsPromise),
  ];
  return new AimpactShell(sandboxPromise, logsProcessors, commandsPreprocessors);
}

function cleanTerminalOutput(input: string): string {
  // Step 1: Remove OSC sequences (including those with parameters)
  const removeOsc = input
    .replace(/\x1b\](\d+;[^\x07\x1b]*|\d+[^\x07\x1b]*)\x07/g, '')
    .replace(/\](\d+;[^\n]*|\d+[^\n]*)/g, '');

  // Step 2: Remove ANSI escape sequences and color codes more thoroughly
  const removeAnsi = removeOsc
    // Remove all escape sequences with parameters
    .replace(/\u001b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    // Remove color codes
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    // Clean up any remaining escape characters
    .replace(/\u001b/g, '')
    .replace(/\x1b/g, '');

  // Step 3: Clean up carriage returns and newlines
  const cleanNewlines = removeAnsi
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // Step 4: Add newlines at key breakpoints while preserving paths
  const formatOutput = cleanNewlines
    // Preserve prompt line
    .replace(/^([~\/][^\n❯]+)❯/m, '$1\n❯')
    // Add newline before command output indicators
    .replace(/(?<!^|\n)>/g, '\n>')
    // Add newline before error keywords without breaking paths
    .replace(/(?<!^|\n|\w)(error|failed|warning|Error|Failed|Warning):/g, '\n$1:')
    // Add newline before 'at' in stack traces without breaking paths
    .replace(/(?<!^|\n|\/)(at\s+(?!async|sync))/g, '\nat ')
    // Ensure 'at async' stays on same line
    .replace(/\bat\s+async/g, 'at async')
    // Add newline before npm error indicators
    .replace(/(?<!^|\n)(npm ERR!)/g, '\n$1');

  // Step 5: Clean up whitespace while preserving intentional spacing
  const cleanSpaces = formatOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  // Step 6: Final cleanup
  return cleanSpaces
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/:\s+/g, ': ') // Normalize spacing after colons
    .replace(/\s{2,}/g, ' ') // Remove multiple spaces
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/\u0000/g, ''); // Remove null characters
}
