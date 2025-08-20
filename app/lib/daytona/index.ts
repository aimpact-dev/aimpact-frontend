import { LazySandbox } from '~/lib/daytona/lazySandbox';

let sandbox: LazySandbox | null = null;

export function getSandbox(): Promise<LazySandbox> {
  if (!sandbox) {
    sandbox = new LazySandbox();
  }
  return Promise.resolve(sandbox);
}

export function cleanup() {
  if(sandbox) {
    sandbox.dispose();
  }
}

