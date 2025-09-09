import { useEffect } from 'react';
import type { ErrorInfo } from '~/utils/errorInfo';
import { workbenchStore } from '~/lib/stores/workbench';


export function RuntimeErrorListener() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        event.data.type === 'AIMPACT_RUNTIME_ERROR'
      ) {
        const errorInfo: ErrorInfo = event.data.data;
        workbenchStore.actionAlert.set (
          {
            type: 'preview',
            title: 'Runtime Error',
            description: errorInfo.message,
            content: `At ${errorInfo.source}:${errorInfo.lineno}:${errorInfo.colno}\n\nStack trace:\n${errorInfo.stack}`,
            source: 'preview'
          }
        );
      }
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
