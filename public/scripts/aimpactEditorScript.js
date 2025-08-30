// This script is responsible for notifying the Aimpact editor about important events such as runtime errors
// or preview loading.
// This file will be automatically excluded from the production build.
// DO NOT MODIFY THIS FILE. ANY CHANGES WILL BE OVERWRITTEN.
(function() {

  function reportError(data) {
    //Send error data to other tabs via BroadcastChannel
    window.parent?.postMessage({ type: 'AIMPACT_RUNTIME_ERROR', data}, "*");
    window.opener?.postMessage({ type: 'AIMPACT_RUNTIME_ERROR', data}, "*");
    //Send error data to the server
    fetch('/__runtime_error__', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  function notifyPreviewLoaded() {
    window.parent?.postMessage({ type: 'AIMPACT_PREVIEW_LOADED' }, "*");
    window.opener?.postMessage({ type: 'AIMPACT_PREVIEW_LOADED' }, "*");
  }

  window.addEventListener('load', notifyPreviewLoaded);

  window.onerror = function(message, source, lineno, colno, error) {
    reportError({
      type: 'error',
      message,
      source,
      lineno,
      colno,
      stack: error && error.stack,
      userAgent: navigator.userAgent,
      url: location.href,
    });
  };

  window.addEventListener('unhandledrejection', function(event) {
    reportError({
      type: 'unhandledrejection',
      reason: event.reason,
      userAgent: navigator.userAgent,
      url: location.href,
    });
  });
})();
