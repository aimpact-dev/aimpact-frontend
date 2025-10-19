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
import { workbenchStore, type ArtifactState, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Tooltip } from '../chat/Tooltip';
import { RuntimeErrorListener } from '~/components/common/RuntimeErrorListener';
import SmartContractView from '~/components/workbench/smartContracts/SmartContractView';
import { lastChatIdx, lastChatSummary, useChatHistory } from '~/lib/persistence';
import { currentParsingMessageState, parserState } from '~/lib/stores/parse';
import { chatStore } from '~/lib/stores/chat';
import { detectStartCommand } from '~/utils/projectCommands';
import { LazySandbox } from '~/lib/daytona/lazySandbox';
import { getSandbox } from '~/lib/daytona';

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

export const Workbench = memo(
  ({ chatStarted, isStreaming, actionRunner, metadata, updateChatMestaData, postMessage }: WorkspaceProps) => {
    renderLogger.trace('Workbench');

    const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
    const [fileHistory, setFileHistory] = useState<Record<string, FileHistory>>({});
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
    const customPreviewState = useRef('');
    const waitForInstallRunned = useRef(false);

    const { takeSnapshot } = useChatHistory();
    const chatIdx = useStore(lastChatIdx);
    const chatSummary = useStore(lastChatSummary);
    const lastSnapshotRef = useRef<number | null>(null);

    const snapshotTakeCooldown = 10000;

    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    useEffect(() => {
      // TODO: I should skip file saving on importing project. And maybe I just really should save only after finishing ai response and on user changes?
      if (!parserState.get().parserRunning) return;

      const removeSubscribe = workbenchStore.files.subscribe((files) => {
        const { initialMessagesIds } = chatStore.get();
        const currentParsingMessage = currentParsingMessageState.get();
        if (!chatIdx) return;

        const snapshotHaveChanges = Object.keys(files).length > 0;
        if ((!currentParsingMessage || !initialMessagesIds.includes(currentParsingMessage)) && snapshotHaveChanges) {
          if (!lastSnapshotRef.current || Date.now() - lastSnapshotRef.current > snapshotTakeCooldown) {
            takeSnapshot(chatIdx, files, undefined, chatSummary);
            console.log('Snapshot was taken on file change');
            lastSnapshotRef.current = Date.now();
          }
        }
      });

      return () => {
        removeSubscribe();
      };
    }, [chatIdx, chatSummary]);

    const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
    const showWorkbench = useStore(workbenchStore.showWorkbench);
    const selectedFile = useStore(workbenchStore.selectedFile);
    const currentDocument = useStore(workbenchStore.currentDocument);
    const unsavedFiles = useStore(workbenchStore.unsavedFiles);
    const files = useStore(workbenchStore.files);
    const selectedView = useStore(workbenchStore.currentView);

    const isSmallViewport = useViewport(1024);

    const setSelectedView = (view: WorkbenchViewType) => {
      workbenchStore.currentView.set(view);
    };

    async function waitForInstallCmd(packageJson: Record<string, any>) {
      const artifacts = Object.values(workbenchStore.artifacts.get());

      const installCmd = `${packageJson.packageManager} install`;
      let artifact: ArtifactState | null = null;
      for (const a of artifacts) {
        if (!a.runner) continue;
        const actions = Object.values(a.runner.actions.get());
        const installCmdAction = actions.find((action) => action.content.endsWith(installCmd));
        if (!installCmdAction) {
          continue;
        }
        artifact = a;
        break;
      }
      if (!artifact) return { status: false, customMsg: false };

      let isCompleted: boolean = false;
      const unsubscribe = artifact.runner.actions.subscribe((state) => {
        const commands = Object.values(state);
        const installCmdAction = commands.find((a) => a.content.endsWith(installCmd));
        if (
          installCmdAction?.status === 'complete' ||
          installCmdAction?.status === 'failed' ||
          installCmdAction?.status === 'aborted'
        ) {
          isCompleted = true;
        }
      });

      let tries = 0;
      while (tries <= 15) {
        if (isCompleted) {
          unsubscribe();
          return { status: true, customMsg: false };
        }
        await sleep(2000);
        tries++;
      }

      return { status: false, customMsg: false };
    }

    useEffect(() => {
      if (hasPreview) return;
      if (selectedView !== 'preview') return;

      const func = async (): Promise<{ customMsg: boolean }> => {
        if (waitForInstallRunned.current === true) return { customMsg: true };

        customPreviewState.current = 'Wait for project initialization...';
        let artifacts: ArtifactState[] = [];

        let artifact: ArtifactState | undefined;
        let tries = 0;
        while (tries < 15) {
          artifacts = Object.values(workbenchStore.artifacts.get());
          artifact = Object.values(artifacts).find((a) => a.runner);
          if (artifact) {
            break;
          }
          await sleep(2000);
        }
        if (!artifact) return { customMsg: false };

        const currentParsingMessage = currentParsingMessageState.get();
        tries = 0;
        while (tries < 15) {
          if (!currentParsingMessage) {
            break;
          }
        }
        if (currentParsingMessage) {
          return { customMsg: true };
        }

        let packageJson: { content: Record<string, any>; packageManager: string } | null = null;
        tries = 0;

        while (tries <= 15) {
          await sleep(2000);
          try {
            packageJson = workbenchStore.getPackageJson();
            break;
          } catch (e) {
            continue;
          } finally {
            tries++;
          }
        }
        if (!packageJson) {
          customPreviewState.current = 'package.json not found';
          return { customMsg: true };
        }

        customPreviewState.current = 'Wait for install...';
        let waitForInstallRes: { status: boolean; customMsg: boolean } | null = null;
        if (waitForInstallRunned.current === false) {
          waitForInstallRunned.current = true;
          waitForInstallRes = await waitForInstallCmd(packageJson);
          waitForInstallRunned.current = false;
        }

        const shell = workbenchStore.getMainShell;
        const startCommandName = detectStartCommand(packageJson);
        const startCommand = `${packageJson.packageManager} run ${startCommandName}`;
        const startCommandInShell = shell.currentProcessingCommand?.endsWith(startCommand);

        if (waitForInstallRes?.status && !startCommandInShell) {
          customPreviewState.current = 'Running...';
          try {
            workbenchStore.startProject(artifact.runner);
          } catch (e) {
            console.error(e);
            customPreviewState.current = 'Failed to run preview. Maybe your project structure is not supported';
          }
          return { customMsg: true };
        }

        return { customMsg: waitForInstallRes?.customMsg || false };
      };

      customPreviewState.current = 'Loading...';
      func().then((res) => {
        console.log('After run preview', res);
        if (!hasPreview && !res.customMsg) {
          customPreviewState.current = 'No preview available.';
        }
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
        .then(() => {})
        .catch(() => {
          toast.error('Failed to update file content');
        });
    }, []);

    const onFileReset = useCallback(() => {
      workbenchStore.resetCurrentDocument();
    }, []);

    const handleSelectFile = useCallback((filePath: string) => {
      workbenchStore.setSelectedFile(filePath);
      workbenchStore.currentView.set('diff');
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
              'fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
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
                <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor gap-1">
                  <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
                  <div className="ml-auto" />
                  {selectedView === 'code' && (
                    <div className="flex items-center gap-2 overflow-y-auto">
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
                      onClick={() => {
                        workbenchStore.showWorkbench.set(false);
                      }}
                    />
                  </Tooltip>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <View initial={{ x: '0%' }} animate={{ x: selectedView === 'code' ? '0%' : '-100%' }}>
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
                  <View
                    initial={{ x: '100%' }}
                    animate={{ x: selectedView === 'diff' ? '0%' : selectedView === 'code' ? '100%' : '-100%' }}
                  >
                    <DiffView
                      fileHistory={fileHistory}
                      setFileHistory={setFileHistory}
                      isTabOpen={selectedView === 'diff'}
                    />
                  </View>
                  <View
                    initial={{ x: '100%' }}
                    animate={{ x: selectedView === 'contracts' ? '0%' : selectedView === 'preview' ? '-100%' : '100%' }}
                  >
                    <SmartContractView postMessage={postMessage} />
                  </View>
                  <View initial={{ x: '100%' }} animate={{ x: selectedView === 'preview' ? '0%' : '100%' }}>
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
