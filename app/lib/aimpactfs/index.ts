import { HybridFs } from '~/lib/aimpactfs/hybridFs';
import { ZenfsImpl } from '~/lib/aimpactfs/zenfsimpl';
import { getSandbox } from '~/lib/daytona';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';

let aimpactFsPromise: Promise<AimpactFs> | null = null;
let zenfsImpl: ZenfsImpl | null = null;

export function getAimpactFs(){
  if (!aimpactFsPromise) {
    if(!zenfsImpl) {
      zenfsImpl = new ZenfsImpl();
    }
    const sandbox = getSandbox();
    const aimpactFs = new HybridFs(zenfsImpl, sandbox);
    aimpactFsPromise = Promise.resolve(aimpactFs);
  }
  return aimpactFsPromise;
}

export async function cleanupZenfs(){
  if(zenfsImpl) {
    await zenfsImpl.rm('/', {force: true, recursive: true});
    zenfsImpl = null;
  }
}
