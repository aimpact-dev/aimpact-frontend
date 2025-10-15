import { useEffect } from "react";
import { cleanupZenfs } from '~/lib/aimpactfs';


export function ZenfsCleanup() {
  useEffect(() => {
    window.addEventListener("beforeunload", cleanupZenfs);
    window.addEventListener('unload', cleanupZenfs);

    return () => {
      cleanupZenfs();
    };
  }, []);

  return null;
}
