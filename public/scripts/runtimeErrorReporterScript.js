// This script is responsible for capturing runtime errors on the client side, so they can be reported to the server.
// This script should not be deleted, moved, or modified.
(function() {
    function reportError(data) {
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