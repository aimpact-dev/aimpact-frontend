import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { AimpactShell, newAimpactShellProcess } from '~/lib/aimpactshell/aimpactShell';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';

export class TerminalStore {
  private readonly sandbox: Promise<AimpactSandbox>;
  private readonly aimpactFs: Promise<AimpactFs>;
  private readonly mainShell: AimpactShell;

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  constructor(sandboxPromise: Promise<AimpactSandbox>, aimpactFsPromise: Promise<AimpactFs>) {
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
}
