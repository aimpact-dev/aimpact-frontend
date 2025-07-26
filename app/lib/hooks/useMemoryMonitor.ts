import { useEffect } from "react";

export function useMemoryMonitor() {
  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      const monitor = setInterval(() => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          console.log({
            used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
            total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
          });
        }
      }, 5000);

      return () => clearInterval(monitor);
    }, []);
  }
}