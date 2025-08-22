import { RemoteSandbox } from '~/lib/daytona/remoteSandbox';
import Cookies from 'js-cookie';

let sandbox: RemoteSandbox | null = null;
let authToken: string | null = null;

export function getSandbox(): Promise<RemoteSandbox> {
  if (!sandbox) {
    sandbox = new RemoteSandbox();
  }
  authToken = Cookies.get('authToken');
  return Promise.resolve(sandbox);
}

export function cleanup() {
  if(sandbox && authToken) {
    sandbox.dispose(authToken);
  }
}

