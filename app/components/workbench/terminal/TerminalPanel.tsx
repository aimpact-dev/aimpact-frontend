import { useStore } from '@nanostores/react';
import { memo, useEffect, useRef } from 'react';
import { Panel, type ImperativePanelHandle } from 'react-resizable-panels';
import { IconButton } from '~/components/ui/IconButton';
import { shortcutEventEmitter } from '~/lib/hooks';
import { themeStore } from '~/lib/stores/theme';
import { workbenchStore } from '~/lib/stores/workbench';
import { Terminal, type TerminalRef } from './Terminal';
import { createScopedLogger } from '~/utils/logger';
import { twMerge } from 'tailwind-merge';

const logger = createScopedLogger('Terminal');

export const DEFAULT_TERMINAL_SIZE = 25;

export const TerminalPanel = memo(() => {
  const showTerminal = useStore(workbenchStore.showTerminal);
  const theme = useStore(themeStore);
  const terminalRef = useRef<TerminalRef | null>(null);
  const terminalPanelRef = useRef<ImperativePanelHandle>(null);
  const terminalToggledByShortcut = useRef(false);

  useEffect(() => {
    const panel = terminalPanelRef.current;
    if (!panel) return;

    const collapsed = panel.isCollapsed();

    if (!showTerminal && !collapsed) {
      panel.collapse();
    } else if (showTerminal && collapsed) {
      panel.resize(DEFAULT_TERMINAL_SIZE);
    }

    terminalToggledByShortcut.current = false;
  }, [showTerminal]);

  useEffect(() => {
    const unsubscribeShortcut = shortcutEventEmitter.on('toggleTerminal', () => {
      terminalToggledByShortcut.current = true;
    });

    const unsubscribeTheme = themeStore.subscribe(() => {
      terminalRef.current?.reloadStyles();
    });

    return () => {
      unsubscribeShortcut();
      unsubscribeTheme();
    };
  }, []);

  return (
    <>
      <div
        className={twMerge(
          'flex items-center bg-bolt-elements-background-depth-2 border-bolt-elements-borderColor p-2 h-[35px]',
          showTerminal ? 'border-y' : 'border-t',
        )}
      >
        <div className="flex items-center text-sm gap-1.5 px-3 py-1 text-bolt-elements-textSecondary">
          <div className="i-ph:terminal-window-duotone text-lg" />
          Terminal
        </div>
        <IconButton
          className="ml-auto"
          icon={showTerminal ? 'i-ph:caret-down' : 'i-ph:caret-up'}
          title={showTerminal ? 'Close' : 'Open'}
          size="md"
          onClick={() => workbenchStore.toggleTerminal(!showTerminal)}
        />
      </div>

      <Panel
        ref={terminalPanelRef}
        defaultSize={showTerminal ? DEFAULT_TERMINAL_SIZE : 0}
        minSize={5}
        collapsible
        onExpand={() => {
          if (!terminalToggledByShortcut.current) {
            workbenchStore.toggleTerminal(true);
          }
        }}
        onCollapse={() => {
          if (!terminalToggledByShortcut.current) {
            workbenchStore.toggleTerminal(false);
          }
        }}
      >
        <div className="h-full bg-bolt-elements-terminals-background">
          {showTerminal && (
            <Terminal
              id="terminal_main"
              className="modern-scrollbar-invert h-full overflow-hidden"
              ref={(ref) => {
                terminalRef.current = ref;
              }}
              onTerminalReady={(terminal) => workbenchStore.attachMainTerminal(terminal)}
              onTerminalResize={() => {}}
              theme={theme}
            />
          )}
        </div>
      </Panel>
    </>
  );
});
