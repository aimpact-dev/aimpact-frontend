import  { type LogProcessor } from '~/lib/aimpactshell/logsProcessors/logProcessor';
import { workbenchStore } from '~/lib/stores/workbench';

const ERROR_MARKER = '[Runtime Error]';

interface ErrorInfo {
  type: string;
  message: string;
  source: string;
  lineno: number;
  colno: number;
  stack: string;
  userAgent: string;
  url: string;
}

export class RuntimeErrorProcessor implements LogProcessor {
  /**
   * The runtime errors are passed to the logs in the following format:
   * [Runtime Error] {
   *   "type": "error",
   *   "message": "Uncaught ReferenceError: x is not defined",
   *   "source": "http://localhost:5173/src/main.tsx",
   *   "lineno": 10,
   *   "colno": 5,
   *   "stack": "Error: Uncaught ReferenceError: x is not defined\n    at main.tsx:10:5\n"
   *   "userAgent": "Mozilla/5.0 ..."
   *   "url": "http://localhost:5173/"
   * }
   *
   * This method searches for [Runtime Error] marker in the logs and extracts the JSON object following it.
   * @param log
   */
  process(log: string): void {
    const markerIndex = log.indexOf(ERROR_MARKER);
    if (markerIndex === -1) return;

    const jsonStartIndex = log.indexOf('{', markerIndex + ERROR_MARKER.length + 1); // +1 to skip the space
    if (jsonStartIndex === -1) {
      console.warn('RuntimeErrorProcessor: No JSON object found after error marker');
      return;
    }

    let braceCount = 0;
    let end = jsonStartIndex;
    for (; end < log.length; end++) {
      if (log[end] === '{') braceCount++;
      if (log[end] === '}') braceCount--;
      if (braceCount === 0) break;
    }
    if (braceCount !== 0) {
      console.warn('RuntimeErrorProcessor: Unmatched braces in JSON object');
      return;
    }
    const jsonString = log.substring(jsonStartIndex, end + 1);

    let errorInfo: ErrorInfo;
    try {
      errorInfo = JSON.parse(jsonString);
    } catch (e) {
      console.error('RuntimeErrorProcessor: Failed to parse JSON object', e);
      return;
    }

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
