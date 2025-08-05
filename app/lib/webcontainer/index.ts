import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';
import type { ActionAlert } from '~/types/actions';

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {

        const { workbenchStore } = await import('~/lib/stores/workbench');

        // Listen for preview errors
        webcontainer.on('preview-message', (message) => {
          console.log('WebContainer preview message:', message);

          // Handle both uncaught exceptions and unhandled promise rejections
          if (
            message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' ||
            message.type === 'PREVIEW_UNHANDLED_REJECTION' ||
            message.type === 'PREVIEW_CONSOLE_ERROR'
          ) {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            const isConsoleError = message.type === 'PREVIEW_CONSOLE_ERROR';
            const title = isPromise
              ? 'Unhandled Promise Rejection'
              : isConsoleError
                ? 'Console Error'
                : 'Uncaught Exception';
            const alert : ActionAlert = {
              type: 'preview',
              title,
              description:
                'message' in message
                  ? message.message
                  : 'args' in message && Array.isArray(message.args) && message.args.length > 0
                    ? message.args[0]
                    : 'Unknown error',
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            };
            workbenchStore.actionAlert.set(alert);
          }
        });

        return webcontainer;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
