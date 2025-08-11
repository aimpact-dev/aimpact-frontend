import { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { WebcontainerFs } from '~/lib/aimpactfs/webcontainerImpl';
import { webcontainer } from '~/lib/webcontainer';

let aimpactFsPromise: Promise<AimpactFs> | null = null;

export function getAimpactFs(){
  if (!aimpactFsPromise) {
    const aimpactFs = new WebcontainerFs(webcontainer);
    aimpactFsPromise = Promise.resolve(aimpactFs);
  }
  return aimpactFsPromise;
}
