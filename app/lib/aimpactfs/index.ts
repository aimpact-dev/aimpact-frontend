import { HybridFs } from '~/lib/aimpactfs/hybridFs';
import { ZenfsImpl } from '~/lib/aimpactfs/zenfsimpl';
import { getSandbox } from '~/lib/daytona';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';

let aimpactFsPromise: Promise<AimpactFs> | null = null;

export function getAimpactFs(){
  if (!aimpactFsPromise) {
    const zenfs = new ZenfsImpl();
    const sandbox = getSandbox();
    const aimpactFs = new HybridFs(zenfs, sandbox);
    aimpactFsPromise = Promise.resolve(aimpactFs);
  }
  return aimpactFsPromise;
}
