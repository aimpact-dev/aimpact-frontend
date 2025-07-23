import { captureRemixErrorBoundaryError } from "@sentry/remix";
import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import React, { Suspense, useEffect, useState, type FC, type PropsWithChildren } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';

import { logStore } from './lib/stores/logs';
import { AuthProvider } from './lib/hooks/useAuth';
import { RefCodeProvider } from './lib/hooks/useRefCode';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';
import { workbenchStore } from "./lib/stores/workbench";
import LoadingScreen from "./components/common/LoadingScreen";
import { useMemoryMonitor } from "./lib/hooks/useMemoryMonitor";

const SolanaProvider = React.lazy(() => 
  import('./components/providers/SolanaProvider').then(mod => ({
    default: mod.default
  }))
);

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
    <script src="https://app.youform.com/widgets/widget.js" />
    <script defer data-domain="aimpact.dev" src="https://plausible.io/js/script.js" />
    <script>{`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}</script>
  </>
));

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      {() => (
        <Suspense fallback={<LoadingScreen />}>
          <SolanaProvider>
            <RefCodeProvider>
              <AuthProvider>
                <DndProvider backend={HTML5Backend}>
                  {children}
                </DndProvider>
              </AuthProvider>
            </RefCodeProvider>
          </SolanaProvider>
        </Suspense>
      )}
    </ClientOnly>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <Providers>{children}</Providers>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

export const ErrorBoundary = () => {
  const error = useRouteError();
  captureRemixErrorBoundaryError(error);
  return <div>Something went wrong</div>;
};

export default function App() {
  const theme = useStore(themeStore);
  useMemoryMonitor();

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    return () => {
      console.log('App unmounting, cleaning up...');
      workbenchStore.cleanup();
    };
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}