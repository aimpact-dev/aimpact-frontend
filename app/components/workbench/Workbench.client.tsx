import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { Popover, Transition } from '@headlessui/react';
import { diffLines, type Change } from 'diff';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import type { FileHistory } from '~/types/actions';
import { DiffView } from './DiffView';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import { useViewport } from '~/lib/hooks';
import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Tooltip } from '../chat/Tooltip';
import { RuntimeErrorListener } from '~/components/common/RuntimeErrorListener';
import SmartContractView from '~/components/workbench/smartContracts/SmartContractView';
import { lastChatIdx, lastChatSummary, useChatHistory } from '~/lib/persistence';
import { detectStartCommand } from '~/utils/projectCommands';
import { streamingState } from '~/lib/stores/streaming';
import type { AimpactShell } from '~/lib/aimpactshell/aimpactShell';
import ConvexView from './convex/ConvexView';
import { chatStore, someActionsFinishedTime } from '~/lib/stores/chat';
import { id } from 'zod/v4/locales';

interface PackageJson {
  content: Record<string, any>;
  packageManager: string;
}

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  actionRunner: ActionRunner;
  metadata?: {
    gitUrl?: string;
  };
  updateChatMestaData?: (metadata: any) => void;
  postMessage: (message: string) => void;
}

const viewTransition = { ease: cubicEasingFn };

function animationForView(view: WorkbenchViewType, selectedView: WorkbenchViewType): { x: '0%' | '100%' | '-100%' } {
  const viewIndex = sliderOptions.findIndex(({ value }) => value === view);
  const selectedViewIndex = sliderOptions.findIndex(({ value }) => value === selectedView);

  const shift = viewIndex === selectedViewIndex ? '0%' : viewIndex < selectedViewIndex ? '-100%' : '100%';
  return { x: shift };
}

const sliderOptions: SliderOptions<WorkbenchViewType> = [
  {
    value: 'code',
    text: 'Code',
  },
  {
    value: 'diff',
    text: 'Diff',
  },
  {
    value: 'contracts',
    text: 'Smart Contracts',
  },
  {
    value: 'convex',
    text: 'Convex',
  },
  {
    value: 'preview',
    text: 'Preview',
  },
];

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const FileModifiedDropdown = memo(
  ({
    fileHistory,
    onSelectFile,
  }: {
    fileHistory: Record<string, FileHistory>;
    onSelectFile: (filePath: string) => void;
  }) => {
    const modifiedFiles = Object.entries(fileHistory);
    const hasChanges = modifiedFiles.length > 0;
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFiles = useMemo(() => {
      return modifiedFiles.filter(([filePath]) => filePath.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [modifiedFiles, searchQuery]);

    return (
      <div className="flex items-center gap-2">
        <Popover className="relative">
          {({ open }: { open: boolean }) => (
            <>
              <Popover.Button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-item-contentDefault">
                <span>File Changes</span>
                {hasChanges && (
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-500 text-xs flex items-center justify-center border border-accent-500/30">
                    {modifiedFiles.length}
                  </span>
                )}
              </Popover.Button>
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Popover.Panel className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-xl bg-bolt-elements-background-depth-2 shadow-xl border border-bolt-elements-borderColor">
                  <div className="p-2">
                    <div className="relative mx-2 mb-2">
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary">
                        <div className="i-ph:magnifying-glass" />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map(([filePath, history]) => {
                          const extension = filePath.split('.').pop() || '';
                          const language = getLanguageFromExtension(extension);

                          return (
                            <button
                              key={filePath}
                              onClick={() => onSelectFile(filePath)}
                              className="w-full px-3 py-2 text-left rounded-md hover:bg-bolt-elements-background-depth-1 transition-colors group bg-transparent"
                            >
                              <div className="flex items-center gap-2">
                                <div className="shrink-0 w-5 h-5 text-bolt-elements-textTertiary">
                                  {['typescript', 'javascript', 'jsx', 'tsx'].includes(language) && (
                                    <div className="i-ph:file-js" />
                                  )}
                                  {['css', 'scss', 'less'].includes(language) && <div className="i-ph:paint-brush" />}
                                  {language === 'html' && <div className="i-ph:code" />}
                                  {language === 'json' && <div className="i-ph:brackets-curly" />}
                                  {language === 'python' && <div className="i-ph:file-text" />}
                                  {language === 'markdown' && <div className="i-ph:article" />}
                                  {['yaml', 'yml'].includes(language) && <div className="i-ph:file-text" />}
                                  {language === 'sql' && <div className="i-ph:database" />}
                                  {language === 'dockerfile' && <div className="i-ph:cube" />}
                                  {language === 'shell' && <div className="i-ph:terminal" />}
                                  {![
                                    'typescript',
                                    'javascript',
                                    'css',
                                    'html',
                                    'json',
                                    'python',
                                    'markdown',
                                    'yaml',
                                    'yml',
                                    'sql',
                                    'dockerfile',
                                    'shell',
                                    'jsx',
                                    'tsx',
                                    'scss',
                                    'less',
                                  ].includes(language) && <div className="i-ph:file-text" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate text-sm font-medium text-bolt-elements-textPrimary">
                                        {filePath.split('/').pop()}
                                      </span>
                                      <span className="truncate text-xs text-bolt-elements-textTertiary">
                                        {filePath}
                                      </span>
                                    </div>
                                    {(() => {
                                      // Calculate diff stats
                                      const { additions, deletions } = (() => {
                                        if (!history.originalContent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const normalizedOriginal = history.originalContent.replace(/\r\n/g, '\n');
                                        const normalizedCurrent =
                                          history.versions[history.versions.length - 1]?.content.replace(
                                            /\r\n/g,
                                            '\n',
                                          ) || '';

                                        if (normalizedOriginal === normalizedCurrent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const changes = diffLines(normalizedOriginal, normalizedCurrent, {
                                          newlineIsToken: false,
                                          ignoreWhitespace: true,
                                          ignoreCase: false,
                                        });

                                        return changes.reduce(
                                          (acc: { additions: number; deletions: number }, change: Change) => {
                                            if (change.added) {
                                              acc.additions += change.value.split('\n').length;
                                            }

                                            if (change.removed) {
                                              acc.deletions += change.value.split('\n').length;
                                            }

                                            return acc;
                                          },
                                          { additions: 0, deletions: 0 },
                                        );
                                      })();

                                      const showStats = additions > 0 || deletions > 0;

                                      return (
                                        showStats && (
                                          <div className="flex items-center gap-1 text-xs shrink-0">
                                            {additions > 0 && <span className="text-green-500">+{additions}</span>}
                                            {deletions > 0 && <span className="text-red-500">-{deletions}</span>}
                                          </div>
                                        )
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 mb-2 text-bolt-elements-textTertiary">
                            <div className="i-ph:file-dashed" />
                          </div>
                          <p className="text-sm font-medium text-bolt-elements-textPrimary">
                            {searchQuery ? 'No matching files' : 'No modified files'}
                          </p>
                          <p className="text-xs text-bolt-elements-textTertiary mt-1">
                            {searchQuery ? 'Try another search' : 'Changes will appear here as you edit'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasChanges && (
                    <div className="border-t border-bolt-elements-borderColor p-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(filteredFiles.map(([filePath]) => filePath).join('\n'));
                          toast('File list copied to clipboard', {
                            icon: <div className="i-ph:check-circle text-accent-500" />,
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
                      >
                        Copy File List
                      </button>
                    </div>
                  )}
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    );
  },
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const Workbench = memo(
  ({ chatStarted, isStreaming, actionRunner, metadata, updateChatMestaData, postMessage }: WorkspaceProps) => {
    renderLogger.trace('Workbench');

    const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
    const [fileHistory, setFileHistory] = useState<Record<string, FileHistory>>({});
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
    const customPreviewState = useRef('');
    const previewStartInProgress = useRef(false);

    const { takeSnapshot } = useChatHistory();
    const chatSummary = useStore(lastChatSummary);
    const lastSnapshotRef = useRef<number | null>(null);
    const chatState = useStore(chatStore);
    const waitingForActionsRef = useRef(false);
    const messagesMetadataState = useStore(workbenchStore.messagesMetadata);
    const artifactsState = useStore(workbenchStore.artifacts);

    useEffect(() => {
      if (waitingForActionsRef.current) return;

      const waitForActions = async () => {
        const maxAttempts = 240;
        const cooldown = 1000;
        let attempt = 0;
        while (attempt < maxAttempts) {
          await sleep(cooldown);
          const artifacts = workbenchStore.artifacts.get();

          // get only assistant or system messages metadata
          const messagesMetadata = Object.values(workbenchStore.messagesMetadata.get()).filter(
            (m) => m.role !== 'user',
          );

          const allActionsFinished = messagesMetadata.every((m) => m.meta?.artifactActionsFinished);
          const anyClosedArtifact = Object.values(artifacts).some((a) => a.closed);

          // if all actions already finished and commited OR there is no closed artifact
          if (allActionsFinished || !anyClosedArtifact) {
            return;
          }

          const messageToActions = Object.fromEntries(
            Object.entries(artifacts).map(([key, artifact]) => [
              key,
              Object.values(artifact?.runner?.actions.get() ?? []),
            ]),
          );
          let havePendingAction: null | string = null;
          for (const [id, actions] of Object.entries(messageToActions)) {
            if (actions.some((a) => a.status === 'pending' || a.status === 'running')) {
              havePendingAction = id;
              continue;
            }
          }
          if (havePendingAction) {
            attempt += 1;
            continue;
          }

          const chatIdx = lastChatIdx.get();
          if (!chatIdx) return;
          const chatSummary = lastChatSummary.get();
          const files = workbenchStore.files.get();

          takeSnapshot(chatIdx, files, undefined, chatSummary)
            .then(() => {
              someActionsFinishedTime.set(Date.now());
              console.log('Snapshot was taken on wait for actions');
            })
            .catch((e) => {
              console.error('error in take snapshot!!!');
              console.error(e);
            });

          // make cooldown between waitForActions
          await sleep(1000);
          return { artifacts, messageToActions };
        }

        return null;
      };

      // why just don't use [artifact] in deps and get message by artifact id? this should be better
      waitingForActionsRef.current = true;
      waitForActions()
        .then((result) => {
          if (!result) {
            return;
          }

          // this code just got harder. so this loop need for checking already completed
          // actions only AFTER already saved snapshot. this is necessary for correct import
          const { artifacts, messageToActions } = result;
          for (const [id, actions] of Object.entries(messageToActions)) {
            if (!actions.length) continue;
            workbenchStore.artifacts.setKey(id, { ...artifacts[id], allActionsFinished: true });
          }
        })
        .finally(() => {
          waitingForActionsRef.current = false;
        });
    }, [messagesMetadataState, artifactsState]);

    const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
    const showWorkbench = useStore(workbenchStore.showWorkbench);
    const selectedFile = useStore(workbenchStore.selectedFile);
    const currentDocument = useStore(workbenchStore.currentDocument);
    const unsavedFiles = useStore(workbenchStore.unsavedFiles);
    const files = useStore(workbenchStore.files);
    const selectedView = useStore(workbenchStore.currentView);

    const isConvexProject = useMemo(() => {
      const actualFiles = workbenchStore.files.get();
      return Object.entries(actualFiles).some(([path, file]) => file?.type === 'folder' && path.endsWith('convex'));
    }, [files]);

    const { isMobile, isSmallViewport } = useViewport();

    const setShowWorkbench = (show: boolean) => {
      workbenchStore.setShowWorkbench(show);
    };

    const setSelectedView = (view: WorkbenchViewType) => {
      workbenchStore.setCurrentView(view);
    };

    /**
     * Returns the first action runner created in the current chat.
     */
    function getFirstActionRunner(): ActionRunner | null {
      const artifacts = Object.values(workbenchStore.artifacts.get());
      const artifact = Object.values(artifacts).find((a) => a.runner);
      if (artifact) {
        return artifact.runner;
      } else {
        return null;
      }
    }

    function aiResponseInProgress(): boolean {
      return streamingState.get();
    }

    function getPackageJson(): PackageJson | null {
      try {
        return workbenchStore.getPackageJson();
      } catch (e) {
        console.log('package.json not found.');
        return null;
      }
    }

    function allActionsFinished(): boolean {
      const artifacts = Object.values(workbenchStore.artifacts.get());
      const finishedStatuses = ['complete', 'failed', 'aborted'];

      for (const artifact of artifacts) {
        if (!artifact.runner) continue;

        const actions = Object.values(artifact.runner.actions.get());
        for (const action of actions) {
          if (!finishedStatuses.includes(action.status)) {
            return false;
          }
        }
      }

      return true;
    }

    function installationRunningOrPending(packageJson: PackageJson, shell: AimpactShell): boolean {
      const installCmd = `${packageJson.packageManager} install`;
      return shell.isRunningOrPending(installCmd);
    }

    function previewCommandIsRunningOrPending(packageJson: PackageJson, shell: AimpactShell): boolean {
      return shell.isRunningOrPending(getPreviewStartCommand(packageJson));
    }

    function getPreviewStartCommand(packageJson: PackageJson) {
      const startCommandName = detectStartCommand(packageJson.content);
      return `${packageJson.packageManager} run ${startCommandName}`;
    }

    useEffect(() => {
      if (hasPreview) return;
      if (selectedView !== 'preview') return;

      const processPreviewStart = async (): Promise<void> => {
        // Only one preview starting process should be running at a time.
        if (previewStartInProgress.current) {
          return;
        }

        // We should keep checking if project state allows for preview as long as user is in preview tab and no preview available.
        const shouldContinue = () => {
          const previewAvailable = workbenchStore.previews.get().length > 0;
          const previewTabOpen = workbenchStore.currentView.get() === 'preview';
          return !previewAvailable && previewTabOpen;
        };

        const skipTimeMs = 2000;
        // If current project state is not suitable for running preview, then we set the message for user and wait for some time.
        const skip = async (message: string): Promise<void> => {
          customPreviewState.current = message;
          await sleep(skipTimeMs);
        };

        previewStartInProgress.current = true;

        while (shouldContinue()) {
          customPreviewState.current = 'Checking if we can run the preview. Please wait...';
          const actionRunner = getFirstActionRunner();
          if (!actionRunner) {
            await skip('Waiting for project initialization...');
            continue;
          }

          if (aiResponseInProgress()) {
            await skip('Processing AI response, please wait...');
            continue;
          }

          const packageJson = getPackageJson();
          if (!packageJson) {
            await skip('Waiting for package.json to be added...');
            continue;
          }

          if (installationRunningOrPending(packageJson, workbenchStore.getMainShell)) {
            await skip('Installing dependencies, please wait...');
            continue;
          }

          if (!allActionsFinished()) {
            await skip('Waiting for AI actions to finish, hang on...');
            continue;
          }

          customPreviewState.current = 'Starting the preview...';
          if (!previewCommandIsRunningOrPending(packageJson, workbenchStore.getMainShell)) {
            let startCommand = getPreviewStartCommand(packageJson);
            workbenchStore.getMainShell.executeCommand(startCommand).catch((err) => {
              console.error(err);
              customPreviewState.current = 'Failed to run preview. Your project structure may not be supported.';
            });
          }
          break;
        }
        previewStartInProgress.current = false;
      };

      processPreviewStart().then(() => {
        console.log('After run preview');
      });
    }, [selectedView, hasPreview]);

    useEffect(() => {
      workbenchStore.setDocuments(files);
    }, [files]);

    const onEditorChange = useCallback<OnEditorChange>((update) => {
      workbenchStore.setCurrentDocumentContent(update.content);
    }, []);

    const onEditorScroll = useCallback<OnEditorScroll>((position) => {
      workbenchStore.setCurrentDocumentScrollPosition(position);
    }, []);

    const onFileSelect = useCallback((filePath: string | undefined) => {
      workbenchStore.setSelectedFile(filePath);
    }, []);

    const onFileSave = useCallback(() => {
      workbenchStore
        .saveCurrentDocument()
        .then(() => {
          const chatIdx = lastChatIdx.get();
          if (!chatIdx) return;
          takeSnapshot(chatIdx, workbenchStore.files.get(), undefined, lastChatSummary.get()).then(() => {
            console.log('Snapshot was taken on file save'); // this log is usefull
          });
        })
        .catch(() => {
          toast.error('Failed to update file content');
        });
    }, []);

    const onFileReset = useCallback(() => {
      workbenchStore.resetCurrentDocument();
    }, []);

    const handleSelectFile = useCallback((filePath: string) => {
      workbenchStore.setSelectedFile(filePath);
      workbenchStore.setCurrentView('diff');
    }, []);

    return (
      chatStarted && (
        <motion.div
          initial="closed"
          animate={showWorkbench ? 'open' : 'closed'}
          variants={workbenchVariants}
          className="z-workbench"
        >
          <div
            className={classNames(
              'absolute top-[3rem] md:top-[1.5rem] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
              {
                'w-full': isSmallViewport,
                'left-0': showWorkbench && isSmallViewport,
                'left-[var(--workbench-left)]': showWorkbench,
                'left-[100%]': !showWorkbench,
              },
            )}
          >
            <div className="absolute inset-0 px-2 lg:px-6">
              <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
                <div className="flex flex-col md:flex-row items-center px-3 py-2 border-b border-bolt-elements-borderColor gap-1">
                  {isMobile ? (
                    <button
                      onClick={() => {
                        setShowWorkbench(false);
                      }}
                      className="flex gap-1 items-center text-sm self-start text-bolt-elements-textSecondary w-full"
                    >
                      <div className="i-ph:arrow-left-bold"></div> Back to chat
                    </button>
                  ) : (
                    <>
                      <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />

                      {selectedView === 'code' && (
                        <div className="flex items-center gap-1 md:gap-2 overflow-y-auto">
                          <PanelHeaderButton
                            className={classNames('mr-1 text-sm flex items-center gap-2', {
                              'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent':
                                isAutoSaveEnabled,
                            })}
                            onClick={() => setIsAutoSaveEnabled((v) => !v)}
                            aria-pressed={isAutoSaveEnabled}
                          >
                            <span className="text-sm">Auto-save</span>
                            <span className="relative ml-1 flex items-center h-5">
                              <span
                                className={`block w-8 h-4 rounded-full transition-colors duration-200 ${isAutoSaveEnabled ? 'bg-accent-500' : 'bg-gray-600'}`}
                              ></span>
                              <span
                                className={`absolute left-0 top-0 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 border border-gray-300 translate-y-1/9 ${isAutoSaveEnabled ? 'translate-x-4' : ''}`}
                              ></span>
                            </span>
                          </PanelHeaderButton>
                          <PanelHeaderButton
                            className="mr-1 text-sm"
                            onClick={() => {
                              workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                            }}
                          >
                            <div className="i-ph:terminal" />
                            Toggle Terminal
                          </PanelHeaderButton>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger className="text-sm flex items-center gap-1 text-bolt-elements-item-contentDefault bg-transparent enabled:hover:text-bolt-elements-item-contentActive rounded-md p-1 enabled:hover:bg-bolt-elements-item-backgroundActive disabled:cursor-not-allowed">
                              <div className="i-ph:box-arrow-up" />
                              {/* Sync & Export */}
                              Export
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content
                              className={classNames(
                                'min-w-[240px] z-[250]',
                                'bg-white dark:bg-[#141414]',
                                'rounded-lg shadow-lg',
                                'border border-gray-200/50 dark:border-gray-800/50',
                                'animate-in fade-in-0 zoom-in-95',
                                'py-1',
                              )}
                              sideOffset={5}
                              align="end"
                            >
                              <DropdownMenu.Item
                                className={classNames(
                                  'cursor-pointer flex items-center w-full px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive gap-2 rounded-md group relative',
                                )}
                                onClick={() => {
                                  workbenchStore.downloadZip();
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="i-ph:download-simple"></div>
                                  <span>Download Code</span>
                                </div>
                              </DropdownMenu.Item>
                              {/* <DropdownMenu.Item
                            className={classNames(
                              'cursor-pointer flex items-center w-full px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive gap-2 rounded-md group relative',
                            )}
                            onClick={handleSyncFiles}
                            disabled={isSyncing}
                          >
                            <div className="flex items-center gap-2">
                              {isSyncing ? <div className="i-ph:spinner" /> : <div className="i-ph:cloud-arrow-down" />}
                              <span>{isSyncing ? 'Syncing...' : 'Sync Files'}</span>
                            </div>
                          </DropdownMenu.Item> */}
                            </DropdownMenu.Content>
                          </DropdownMenu.Root>
                        </div>
                      )}

                      {selectedView === 'diff' && (
                        <FileModifiedDropdown fileHistory={fileHistory} onSelectFile={handleSelectFile} />
                      )}

                      <Tooltip content="Close" side="left">
                        <IconButton
                          icon="i-ph:x-circle"
                          className="-mr-1"
                          size="xl"
                          onClick={() => setShowWorkbench(false)}
                        />
                      </Tooltip>
                    </>
                  )}
                </div>
                <div className="relative flex-1 overflow-hidden">
                  {!isMobile && (
                    <>
                      <View initial={{ x: '0%' }} animate={animationForView('code', selectedView)}>
                        <EditorPanel
                          editorDocument={currentDocument}
                          isStreaming={isStreaming}
                          selectedFile={selectedFile}
                          files={files}
                          unsavedFiles={unsavedFiles}
                          fileHistory={fileHistory}
                          onFileSelect={onFileSelect}
                          onEditorScroll={onEditorScroll}
                          onEditorChange={onEditorChange}
                          onFileSave={onFileSave}
                          onFileReset={onFileReset}
                          isAutoSaveEnabled={isAutoSaveEnabled}
                        />
                      </View>
                      <View initial={{ x: '100%' }} animate={animationForView('diff', selectedView)}>
                        <DiffView
                          fileHistory={fileHistory}
                          setFileHistory={setFileHistory}
                          isTabOpen={selectedView === 'diff'}
                        />
                      </View>
                    </>
                  )}

                  <View initial={{ x: '100%' }} animate={animationForView('contracts', selectedView)}>
                    <SmartContractView postMessage={postMessage} />
                  </View>
                  <View initial={{ x: '100%' }} animate={animationForView('convex', selectedView)}>
                    <ConvexView isConvexProject={isConvexProject} />
                  </View>
                  <View initial={{ x: '100%' }} animate={animationForView('preview', selectedView)}>
                    <Preview customText={customPreviewState.current} />
                  </View>
                </div>
              </div>
            </div>
          </div>
          <PushToGitHubDialog
            isOpen={isPushDialogOpen}
            onClose={() => setIsPushDialogOpen(false)}
            onPush={async (repoName, username, token, isPrivate) => {
              try {
                console.log('Dialog onPush called with isPrivate =', isPrivate);
                const commitMessage = prompt('Please enter a commit message:', 'Initial commit') || 'Initial commit';
                const repoUrl = await workbenchStore.pushToGitHub(repoName, commitMessage, username, token, isPrivate);

                if (updateChatMestaData && !metadata?.gitUrl) {
                  updateChatMestaData({
                    ...(metadata || {}),
                    gitUrl: repoUrl,
                  });
                }

                return repoUrl;
              } catch (error) {
                console.error('Error pushing to GitHub:', error);
                toast.error('Failed to push to GitHub');
                throw error;
              }
            }}
          />
          <RuntimeErrorListener />
        </motion.div>
      )
    );
  },
);

// View component for rendering content with motion transitions
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
