import type { ITerminal } from '~/types/terminal';

const IGNORE_SEQUENCES = [
  '\x1b[A', // Up arrow
  '\x1b[B', // Down arrow
  '\x1b[C', // Right arrow
  '\x1b[D', // Left arrow
  '\x1b[3~', // Delete key
  '\x1b[5~', // Page Up
  '\x1b[6~', // Page Down
  '\x1bOH',  // Home key (alternative)
  '\x1bOF',   // End key (alternative)
  // F1–F12 keys (common xterm sequences)
  '\x1bOP',  // F1
  '\x1bOQ',  // F2
  '\x1bOR',  // F3
  '\x1bOS',  // F4
  '\x1b[15~', // F5
  '\x1b[17~', // F6
  '\x1b[18~', // F7
  '\x1b[19~', // F8
  '\x1b[20~', // F9
  '\x1b[21~', // F10
  '\x1b[23~', // F11
  '\x1b[24~', // F12
  // Other non-printable keys
  '\x1b[1~', // Home
  '\x1b[4~', // End
  '\x1b[Z',  // Shift+Tab
]

export class CommandBuffer {
  private terminal: ITerminal | null = null;
  //Keeping track of the ITerminal onData events. They represent terminal input.
  private commandBuffer: string[] = [];

  private executeCallback: (command: string) => Promise<void>;

  constructor(executeCallback: (command: string) => Promise<void>) {
    this.executeCallback = executeCallback;
  }

  setTerminal(terminal: ITerminal): void {
    this.terminal = terminal;
    terminal.onData(async (data: string) => {
      await this.addToCommandBuffer(data);
    });
  }

  private async addToCommandBuffer(data: string){
    if(!this.terminal) {
      console.error("Terminal is not set. Cannot add to command buffer.");
      return;
    }
    if (IGNORE_SEQUENCES.includes(data)) {
      return;
    }

    for (const char of data) {
      //Checking for backspace (delete) key press.
      if (char === '\b' || char === '\x7f') {
        if (this.commandBuffer.length > 0) {
          this.commandBuffer.pop(); // Remove last character from buffer
          this.terminal.write('\b \b'); // Move cursor back, clear character, and move back again
        }
      } else {
        this.terminal.write(char); // Write the character to the terminal
      }

      //Checking for enter key press.
      if (char === '\n' || char === '\r') {
        this.terminal.write('\n');
        if (this.commandBuffer.length === 0) return;
        const command = this.commandBuffer.join('');
        this.commandBuffer = []; // Clear the buffer
        await this.executeCallback(command); // Handle the command
      } else if(char !== '\b' && char !== '\x7f' && char !== '\n' && char !== '\r'){
        this.commandBuffer.push(char); // Add character to buffer
      }
    }
  }
}
