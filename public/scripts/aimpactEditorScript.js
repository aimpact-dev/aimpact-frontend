(function () {
  if (typeof window === 'undefined') return;

  function reportError(data) {
    window.parent?.postMessage({ type: 'AIMPACT_RUNTIME_ERROR', data }, '*');
    window.opener?.postMessage({ type: 'AIMPACT_RUNTIME_ERROR', data }, '*');

    fetch('/__runtime_error__', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }

  function notifyPreviewLoaded() {
    window.parent?.postMessage({ type: 'AIMPACT_PREVIEW_LOADED' }, '*');
    window.opener?.postMessage({ type: 'AIMPACT_PREVIEW_LOADED' }, '*');
  }

  if (document.readyState === 'complete') {
    notifyPreviewLoaded();
  } else {
    window.addEventListener('load', notifyPreviewLoaded);
  }

  window.onerror = function (message, source, lineno, colno, error) {
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

  window.addEventListener('unhandledrejection', function (event) {
    reportError({
      type: 'unhandledrejection',
      reason: event.reason,
      userAgent: navigator.userAgent,
      url: location.href,
    });
  });
})();
