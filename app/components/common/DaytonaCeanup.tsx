import { useEffect } from "react";
import { cleanup } from '~/lib/daytona';


export function DaytonaCleanup() {
  useEffect(() => {
    window.addEventListener("beforeunload", cleanup);
    window.addEventListener('unload', cleanup);

    return () => {
      cleanup();
    };
  }, []);

  return null;
}
