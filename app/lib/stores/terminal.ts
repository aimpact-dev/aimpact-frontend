import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { coloredText } from '~/utils/terminal';
import type { Sandbox } from '@daytonaio/sdk';
import { AimpactShell, newAimpactShellProcess } from '~/utils/aimpactShell';

export class TerminalStore {
  #sandbox: Promise<Sandbox>;
  private aimpactTerminals: Array<AimpactShell> = [];
  private mainShell: AimpactShell;

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  constructor(sandboxPromise: Promise<Sandbox>) {
    this.#sandbox = sandboxPromise;

    this.mainShell = newAimpactShellProcess(sandboxPromise);

    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }

  }
  get getMainShell() {
    return this.mainShell;
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }

  async attachMainAimpactTerminal(terminal: ITerminal) {
    this.mainShell.setTerminal(terminal);
  }

  async attachAimpactTerminal(terminal: ITerminal){
    try{
      const aimpactShell = newAimpactShellProcess(this.#sandbox);
      aimpactShell.setTerminal(terminal);
      this.aimpactTerminals.push(aimpactShell);
    }
    catch (error: any) {
      terminal.write(coloredText.red('Failed to spawn aimpact shell\n\n') + error.message);
      return;
    }
  }
}
