// This script is responsible for capturing runtime errors on the client side, so they can be reported to the server.
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
