import { init, replayIntegration, browserTracingIntegration, browserProfilingIntegration } from "@sentry/remix";
import { RemixBrowser, useLocation, useMatches } from '@remix-run/react';
import { startTransition, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { AppProvider } from '~/providers';

init({
    dsn: "https://3ce6d32dc3d38efe0423220e0772c4a6@o4509436444278784.ingest.de.sentry.io/4509436451618896",
    tracesSampleRate: 0.05,
    integrations: [browserTracingIntegration({
      useEffect,
      useLocation,
      useMatches
    }), replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
    }), browserProfilingIntegration()],

    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 0.1,
    sampleRate: 0.25,
    environment: import.meta.env.ENVIRONMENT || 'development',
    profileSessionSampleRate: 0.01,
    profileLifecycle: 'trace',
})

const root = document.getElementById('root')!;

startTransition(() => {
  hydrateRoot(
    root,
    <AppProvider>
      <RemixBrowser />
    </AppProvider>,
  );
});
