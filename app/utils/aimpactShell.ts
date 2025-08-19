import type { ITerminal } from '~/types/terminal';
import type { Sandbox } from '@daytonaio/sdk';
import { v4 as uuidv4 } from 'uuid';
import { coloredText } from '~/utils/terminal';
import { getPortCatcher } from '~/utils/portCatcher';

export type ExecutionResult = { output: string; exitCode: number } | undefined;

export class AimpactShell {
  #terminal: ITerminal | undefined;
  #sandboxPromise: Promise<Sandbox>;

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

  //Every time we receive a new log, we pass it to these functions.
  //May be useful for retrieving information from the logs.
  #logsProcessors: {process: (log:string) => void}[] = [];


  constructor(sandboxPromise: Promise<Sandbox>, logsProcessors: {process: (log:string) => void}[] = []) {
    this.#logsProcessors = logsProcessors;
    this.#sandboxPromise = sandboxPromise;
    if (!sandboxPromise){
      console.log("Sandbox is undefined");
    }
  }

  setTerminal(terminal: ITerminal) {
    this.#terminal = terminal;
    terminal.onData(async (data: string) => {
      console.log('Terminal data received:', data);
      await this.addToCommandBuffer(data);
    });
  }

  private async addToCommandBuffer(data: string){
    if(!this.#terminal) {
      console.error("Terminal is not set. Cannot add to command buffer.");
      return;
    }
    for (const char of data) {
      //Checking for backspace (delete) key press.
      if (char === '\b' || char === '\x7f') {
        if (this.#commandBuffer.length > 0) {
          this.#commandBuffer.pop(); // Remove last character from buffer
          this.#terminal.write('\b \b'); // Move cursor back, clear character, and move back again
        }
      } else {
        this.#terminal.write(char); // Write the character to the terminal
      }

      //Checking for enter key press.
      if (char === '\n' || char === '\r') {
        this.#terminal.write('\n');
        if (this.#commandBuffer.length === 0) return;
        const command = this.#commandBuffer.join('');
        this.#commandBuffer = []; // Clear the buffer
        await this.executeCommand(command); // Handle the command
      } else {
        this.#commandBuffer.push(char); // Add character to buffer
      }
    }
  }

  async executeCommand(command: string, abort?: () => void): Promise<ExecutionResult>{
    const sandbox = await this.#sandboxPromise;
    if (this.#executionState){
      console.log("Execution state is already set, aborting previous command.");
      //Some command is currently running, we need to abort it first.
      if (this.#executionState.abort) {
        this.#executionState.abort();
      }
      //Currently there is no way to kill running process in Daytona.io API,
      //so we delete the session instead.
      console.log("Deleting session:", this.#executionState.sessionId);
      await sandbox.process.deleteSession(this.#executionState.sessionId);
      //Wait for previous command to finish executing.
      await this.#executionState.executionPromise;
    }

    //We create a new session for each new command.
    const sessionId = uuidv4();
    await sandbox.process.createSession(sessionId);

    const commandRequest = {
      command: command,
      runAsync: true, //If you run something like 'npm run dev' in sync mode you will wait for it forever.
    };
    console.log("Executing command: ", command, "in session:", sessionId);
    const response =
      await sandbox.process.executeSessionCommand(sessionId, commandRequest);
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
    const sandbox = await this.#sandboxPromise;
    try{
      while (true){
        console.log("Polling command state for session:", sessionId, "command:", commandId);
        const commandState = await sandbox.process.getSessionCommand(sessionId, commandId);
        console.log("Received command state:", commandState);
        const commandLogs = await sandbox.process.getSessionCommandLogs(sessionId, commandId);
        console.log("Received command logs:", commandLogs, "length:", commandLogs.length);
        //We need to output new logs to the terminal.
        //These have to be new logs only, so we keep track of the last log length.
        if (commandLogs) {
          let newLogs = commandLogs.slice(this.#lastLogLength);
          if (newLogs) {
            //Feed new logs to the logs processors.
            for (const logsProcessor of this.#logsProcessors) {
              logsProcessor.process(newLogs);
            }
            if(commandState.exitCode !== undefined && commandState.exitCode !== 0){
              newLogs = coloredText.red(newLogs);
            }
            this.#terminal?.write(newLogs);
          }
          this.#lastLogLength = commandLogs.length;
        }
        if(commandState.exitCode !== undefined){
          console.log("Received exit code for command:", commandState.exitCode, "in session:", sessionId, "command:", commandId);
          console.log("Cleaning up session:", sessionId, "after command execution.");
          //If command finished running, then we need to delete its session
          await sandbox.process.deleteSession(sessionId);
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
    }
    catch (e) {
      console.error('Error polling command state:', e);
      this.#executionState = undefined;
      this.#lastLogLength = 0;
      return undefined;
    }
  }
}

//Using this function for creating a new AimpactShell instance is preferable, because it attaches
//log processor for capturing preview port from Daytona.io server.
export function newAimpactShellProcess(sandboxPromise: Promise<Sandbox>): AimpactShell {
  const portCatcher = getPortCatcher();
  const logsProcessor = {
    process: (log: string) => {
      console.log("Looking for port in log:", log);
      const extractedPort = log.match(/http:\/\/localhost:(\d+)/)?.[1];
      console.log("Extracted port:", extractedPort);
      if (extractedPort) {
        const portNumber = Number(extractedPort);
        if (!isNaN(portNumber)) {
          portCatcher.putNewPort(portNumber);
          console.log(`Captured port: ${portNumber}`);
        } else {
          console.warn(`Invalid port number extracted: ${extractedPort}`);
        }
      }
    }
  }
  const processors = [logsProcessor];
  return new AimpactShell(sandboxPromise, processors);
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
