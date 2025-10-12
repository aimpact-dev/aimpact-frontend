import { RemoteSandbox } from '~/lib/daytona/remoteSandbox';
import { useAuth } from '~/lib/hooks/useAuth';
import type { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';

let sandbox: AimpactSandbox | null = null;

export function getSandbox(): Promise<AimpactSandbox> {
  if (!sandbox) {
    sandbox = new RemoteSandbox();
  }
  return Promise.resolve(sandbox);
}

export function cleanup() {
  if(sandbox) {
    sandbox.dispose();
    sandbox = null;
  }
}

