import { useEffect } from "react";
import { disposeWorkbenchStore } from '~/lib/stores/workbench';


export function WorkbenchCleanup() {
  useEffect(() => {
    window.addEventListener("beforeunload", disposeWorkbenchStore);
    window.addEventListener('unload', disposeWorkbenchStore);

    return () => {
      disposeWorkbenchStore();
    };
  }, []);

  return null;
}
