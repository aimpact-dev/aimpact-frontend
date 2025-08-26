import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { coloredText } from '~/utils/terminal';
import { AimpactShell, newAimpactShellProcess } from '~/lib/aimpactshell/aimpactShell';
import type { LazySandbox } from '~/lib/daytona/lazySandbox';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { RemoteSandbox } from '~/lib/daytona/remoteSandbox';

export class TerminalStore {
  private readonly sandbox: Promise<RemoteSandbox>;
  private readonly aimpactFs: Promise<AimpactFs>;
  private aimpactTerminals: Array<AimpactShell> = [];
  private readonly mainShell: AimpactShell;

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  constructor(sandboxPromise: Promise<RemoteSandbox>, aimpactFsPromise: Promise<AimpactFs>) {
    this.sandbox = sandboxPromise;
    this.aimpactFs = aimpactFsPromise;

    this.mainShell = newAimpactShellProcess(sandboxPromise, aimpactFsPromise);

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
      const aimpactShell = newAimpactShellProcess(this.sandbox, this.aimpactFs);
      aimpactShell.setTerminal(terminal);
      this.aimpactTerminals.push(aimpactShell);
    }
    catch (error: any) {
      terminal.write(coloredText.red('Failed to spawn aimpact shell\n\n') + error.message);
      return;
    }
  }
}
