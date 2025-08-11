import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { newBoltShellProcess, newShellProcess } from '~/utils/shell';
import { coloredText } from '~/utils/terminal';
import type { Sandbox } from '@daytonaio/sdk';
import { AimpactShell, newAimpactShellProcess } from '~/utils/aimpactShell';

export class TerminalStore {
  #webcontainer: Promise<WebContainer>;
  #sandbox: Promise<Sandbox>;
  #terminals: Array<{ terminal: ITerminal; process: WebContainerProcess }> = [];
  #aimpactTerminals: Array<AimpactShell> = [];
  #boltTerminal = newBoltShellProcess();

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  constructor(webcontainerPromise: Promise<WebContainer>, sandboxPromise: Promise<Sandbox>) {
    this.#webcontainer = webcontainerPromise;
    this.#sandbox = sandboxPromise;

    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }
  get boltTerminal() {
    return this.#boltTerminal;
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }

  async attachAimpactTerminal(terminal: ITerminal){
    try{
      const sandbox = await this.#sandbox;
      const aimpactShell = newAimpactShellProcess(sandbox, terminal);
      this.#aimpactTerminals.push(aimpactShell);
    }
    catch (error: any) {
      terminal.write(coloredText.red('Failed to spawn aimpact shell\n\n') + error.message);
      return;
    }
  }

  async attachBoltTerminal(terminal: ITerminal) {
    try {
      const wc = await this.#webcontainer;
      await this.#boltTerminal.init(wc, terminal);
    } catch (error: any) {
      terminal.write(coloredText.red('Failed to spawn bolt shell\n\n') + error.message);
      return;
    }
  }

  async attachTerminal(terminal: ITerminal) {
    try {
      const shellProcess = await newShellProcess(await this.#webcontainer, terminal);
      this.#terminals.push({ terminal, process: shellProcess });
    } catch (error: any) {
      terminal.write(coloredText.red('Failed to spawn shell\n\n') + error.message);
      return;
    }
  }

  onTerminalResize(cols: number, rows: number) {
    for (const { process } of this.#terminals) {
      process.resize({ cols, rows });
    }
  }
}
