import type { ITerminal } from '~/types/terminal';
import type { Sandbox } from '@daytonaio/sdk';
import { v4 as uuidv4 } from 'uuid';

export type ExecutionResult = { output: string; exitCode: number } | undefined;

export class AimpactShell {
  #terminal: ITerminal;
  #sandbox: Sandbox;

  //Keeping track of the ITerminal onData events. They represent terminal input.
  #commandBuffer: string[] = [];

  //State of the currently executing command. undefined if no command is running.
  #executionState: {
    sessionId: string,
    commandId: string,
    executionPromise: Promise<ExecutionResult>,
    abort?: () => void} | undefined;
  //Some commands are long running, so the only way to check their execution state is to poll them periodically.
  #commandPollingInterval: number = 1000;
  #lastLogLength: number = 0;


  constructor(sandbox: Sandbox, terminal: ITerminal) {
    this.#sandbox = sandbox;
    this.#terminal = terminal;
    terminal.onData(async (data: string) => {
      await this.addToCommandBuffer(data);
    });
  }

  async addToCommandBuffer(data: string){
    for (const char of data) {
      if (char === '\n' || char === '\r') {
        const command = this.#commandBuffer.join('');
        this.#commandBuffer = []; // Clear the buffer
        await this.executeCommand(command); // Handle the command
      } else {
        this.#commandBuffer.push(char); // Add character to buffer
      }
    }
  }

  async executeCommand(command: string, abort?: () => void): Promise<ExecutionResult>{
    if (this.#executionState){
      //Some command is currently running, we need to abort it first.
      if (this.#executionState.abort) {
        this.#executionState.abort();
      }
      //Currently there is no way to kill running process in Daytona.io API,
      //so we delete the session instead.
      await this.#sandbox.process.deleteSession(this.#executionState.sessionId);
      //Wait for previous command to finish executing.
      await this.#executionState.executionPromise;
    }

    //We create a new session for each new command.
    const sessionId = uuidv4();
    await this.#sandbox.process.createSession(sessionId);

    const commandRequest = {
      command: command,
      runAsync: true, //If you run something like 'npm run dev' in sync mode you will wait for it forever.
    };
    const response =
      await this.#sandbox.process.executeSessionCommand(sessionId, commandRequest);
    const commandId = response.cmdId;
    const executionPromise = this._pollCommandState(sessionId, commandId!);
    this.#executionState = {
      sessionId: sessionId,
      commandId: commandId!,
      executionPromise: executionPromise,
      abort: abort, //Allow to abort the command
    };

    return await executionPromise;
  }

  //This method periodically checks the currently running command state, takes the logs
  //and outputs new logs to the ITerminal instance.
  async _pollCommandState(sessionId: string, commandId: string) : Promise<ExecutionResult>{
    try{
      const commandState = await this.#sandbox.process.getSessionCommand(sessionId, commandId);
      const commandLogs = await this.#sandbox.process.getSessionCommandLogs(sessionId, commandId);
      //We need to output new logs to the terminal.
      //These have to be new logs only, so we keep track of the last log length.
      if (commandLogs) {
        const newLogs = commandLogs.slice(this.#lastLogLength);
        if (newLogs) {
          this.#terminal.write(newLogs);
        }
        this.#lastLogLength = commandLogs.length;
      }
      if(commandState.exitCode){
        //If command finished running, then we need to delete its session
        await this.#sandbox.process.deleteSession(sessionId);
        //Reset the execution state
        this.#executionState = undefined;
        this.#lastLogLength = 0;
        return {
          output: cleanTerminalOutput(commandLogs),
          exitCode: commandState.exitCode,
        }
      }
      await new Promise(resolve => setTimeout(resolve, this.#commandPollingInterval));
    }
    catch (e) {
      console.error('Error polling command state:', e);
      this.#executionState = undefined;
      this.#lastLogLength = 0;
      return undefined;
    }
  }
}

export function newAimpactShellProcess(sandbox: Sandbox, terminal: ITerminal): AimpactShell {
  return new AimpactShell(sandbox, terminal);
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
