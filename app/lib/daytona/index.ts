import { RemoteSandbox } from '~/lib/daytona/remoteSandbox';
import { useAuth } from '~/lib/hooks/useAuth';

let sandbox: RemoteSandbox | null = null;

export function getSandbox(): Promise<RemoteSandbox> {
  if (!sandbox) {
    sandbox = new RemoteSandbox();
  }
  return Promise.resolve(sandbox);
}

export function cleanup() {
  if(sandbox) {
    sandbox.dispose();
  }
}

