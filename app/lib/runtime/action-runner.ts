import { path as nodePath } from '~/utils/path';
import { map, type MapStore } from 'nanostores';
import type { ActionAlert, BoltAction, DeployAlert, FileHistory, SupabaseAction, SupabaseAlert } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import { parseOldNewPairs, type ActionCallbackData } from './message-parser';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import type { AimpactShell } from '~/lib/aimpactshell/aimpactShell';
import type { BuildService } from '~/lib/services/buildService';
import { getSandbox } from '~/lib/daytona';
import { isBinaryPath } from '~/utils/fileExtensionUtils';
import { ac } from 'vitest/dist/chunks/reporters.nr4dxCkA.js';
import { validateAnchorProject } from '../smartContracts/anchorProjectUtils';
import { ContractBuildService } from '~/lib/smartContracts/contractBuildService';
import { chatId } from '~/lib/persistence';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractValidationError';
  }
}

class ActionCommandError extends Error {
  readonly _output: string;
  readonly _header: string;

  constructor(message: string, output: string) {
    // Create a formatted message that includes both the error message and output
    const formattedMessage = `Failed To Execute Shell Command: ${message}\n\nOutput:\n${output}`;
    super(formattedMessage);

    // Set the output separately so it can be accessed programmatically
    this._header = message;
    this._output = output;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ActionCommandError.prototype);

    // Set the name of the error for better debugging
    this.name = 'ActionCommandError';
  }

  // Optional: Add a method to get just the terminal output
  get output() {
    return this._output;
  }
  get header() {
    return this._header;
  }
}

export class ActionRunner {
  #buildService: Promise<BuildService>;
  #aimpactFs: Promise<AimpactFs>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #shellTerminal: () => AimpactShell;
  actions: ActionsMap = map({});
  onAlert?: (alert: ActionAlert) => void;
  onSupabaseAlert?: (alert: SupabaseAlert) => void;
  onDeployAlert?: (alert: DeployAlert) => void;
  buildOutput?: { path: string; exitCode: number; output: string };

  constructor(
    buildServicePromise: Promise<BuildService>,
    aimpactFsPromise: Promise<AimpactFs>,
    getShellTerminal: () => AimpactShell,
    onAlert?: (alert: ActionAlert) => void,
    onSupabaseAlert?: (alert: SupabaseAlert) => void,
    onDeployAlert?: (alert: DeployAlert) => void,
  ) {
    this.#buildService = buildServicePromise;
    this.#aimpactFs = aimpactFsPromise;
    this.#shellTerminal = getShellTerminal;
    this.onAlert = onAlert;
    this.onSupabaseAlert = onSupabaseAlert;
    this.onDeployAlert = onDeployAlert;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return; // No return value here
    }

    if (isStreaming && action.type !== 'file' && action.type !== 'update') {
      return; // No return value here
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId, isStreaming);
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });

    await this.#currentExecutionPromise;

    return;
  }

  async #executeAction(actionId: string, isStreaming: boolean = false) {
    const action = this.actions.get()[actionId];

    // Waiting for the sandbox to be ready
    await getSandbox();

    this.#updateAction(actionId, { status: 'running' });

    logger.debug('executing action');
    logger.debug(action);
    try {
      switch (action.type) {
        case 'shell': {
          await this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
        case 'supabase': {
          try {
            await this.handleSupabaseAction(action as SupabaseAction);
          } catch (error: any) {
            // Update action status
            this.#updateAction(actionId, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Supabase action failed',
            });

            // Return early without re-throwing
            return;
          }
          break;
        }
        case 'build': {
          const buildOutput = await this.#runBuildAction(action);

          // Store build output for deployment
          this.buildOutput = buildOutput;
          break;
        }
        case 'update': {
          await this.#runUpdateAction(action);
          break;
        }
        case 'buildContract': {
          await this.#runBuildContractAction(action);
          break;
        }
      }

      this.#updateAction(actionId, {
        status: isStreaming ? 'running' : action.abortSignal.aborted ? 'aborted' : 'complete',
      });
    } catch (error) {
      if (action.abortSignal.aborted) {
        return;
      }

      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
      logger.error(`[${action.type}]:Action failed\n\n`, error);

      if(error instanceof ContractValidationError){
        this.onAlert?.({
          type: 'error',
          title: 'Anchor project is invalid',
          description: 'Cannot build smart contract, the validation have failed',
          content: error.message,
        });
        return;
      }

      if (!(error instanceof ActionCommandError)) {
        return;
      }

      this.onAlert?.({
        type: 'error',
        title: 'Dev Server Failed',
        description: error.header,
        content: error.output,
      });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async runShellAction(action: ActionState) {
    return this.#runShellAction(action);
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    const shell = this.#shellTerminal();
    if (!shell) {
      unreachable('Shell terminal not found');
    }

    const resp = await shell.executeCommand(action.content, () => {
      logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort();
    });
    logger.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    if (resp?.exitCode != 0) {
      throw new ActionCommandError(`Failed To Execute Shell Command`, resp?.output || 'No Output Available');
    }
  }

  async #runUpdateAction(action: ActionState) {
    logger.debug('Trying to update');
    if (action.type !== 'update') {
      unreachable('Expected update action');
    }

    const fs = await this.#aimpactFs;
    let actionPath = action.filePath;
    if (!action.filePath.startsWith('/')) {
      // If the filePath is not absolute, we assume it's relative to the current working directory
      actionPath = nodePath.join(await fs.workdir(), action.filePath);
    }
    const relativePath = nodePath.relative(await fs.workdir(), actionPath);

    if ((await fs.fileExists(relativePath)) === false) {
      logger.debug(`File ${relativePath} does not exists`);
      return;
    }

    try {
      const isBinary = isBinaryPath(action.filePath);
      const encoding = isBinary ? 'base64' : 'utf-8';
      const oldNewPair = parseOldNewPairs(action.content);
      if (!oldNewPair.old) {
        logger.error(`Reverted: Update actino have empt old string`);
        return;
      }

      const fileContent = await fs.readFile(relativePath, encoding);
      if (!fileContent.search(oldNewPair.old)) {
        logger.debug(`File ${relativePath} doesn't have old content`);
      } else {
        logger.debug(`File have content`);
      }

      let updatedContent: string;
      if (action.occurrences === 'all') {
        updatedContent = fileContent.replaceAll(oldNewPair.old, oldNewPair.new);
      } else if (action.occurrences === 'nth' && action.n) {
        let count = 0;
        // replace only on some index
        updatedContent = fileContent.replace(oldNewPair.old, (match) => {
          count++;
          if (count === action.n) {
            return oldNewPair.new;
          }
          return match;
        });
      } else {
        updatedContent = fileContent.replace(oldNewPair.old, oldNewPair.new);
      }
      console.log('updated content', updatedContent);
      const buffer = Buffer.from(updatedContent, isBinary ? 'base64' : 'utf-8');

      await fs.writeFile(relativePath, buffer, encoding);
      logger.debug(`File updated ${relativePath}`);
    } catch (error) {
      logger.error(`Failed to update file ${relativePath}\n\n`, error);
    }
  }

  async #runBuildContractAction(action: ActionState){
    logger.debug('Trying to build contract');
    if (action.type !== 'buildContract') {
      unreachable('Expected build contract action');
    }

    const validationResult = validateAnchorProject();
    if(validationResult.status !== 'VALID'){
      throw new ContractValidationError(validationResult.message);
    }

    const buildService = new ContractBuildService();
    const projectId = chatId.get();
    if(!projectId){
      throw new Error('Cannot build smart contract, project id is undefined.');
    }
    await buildService.requestContractBuild(projectId);
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const fs = await this.#aimpactFs;
    let actionPath = action.filePath;
    if (!action.filePath.startsWith('/')) {
      // If the filePath is not absolute, we assume it's relative to the current working directory
      actionPath = nodePath.join(await fs.workdir(), action.filePath);
    }
    const relativePath = nodePath.relative(await fs.workdir(), actionPath);

    let folder = nodePath.dirname(relativePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        await fs.mkdir(folder);
        logger.debug('Created folder', folder);
      } catch (error) {
        logger.error('Failed to create folder\n\n', folder);
      }
    }

    try {
      const isBinary = isBinaryPath(action.filePath);
      const encoding = isBinary ? 'base64' : 'utf-8';
      const buffer = Buffer.from(action.content, isBinary ? 'base64' : 'utf-8');
      await fs.writeFile(relativePath, buffer, encoding);
      logger.debug(`File written ${relativePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }

  async getFileHistory(filePath: string): Promise<FileHistory | null> {
    try {
      const fs = await this.#aimpactFs;
      const historyPath = this.#getHistoryPath(filePath);
      const content = await fs.readFile(historyPath, 'utf-8');

      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to get file history:', error);
      return null;
    }
  }

  async saveFileHistory(filePath: string, history: FileHistory) {
    const historyPath = this.#getHistoryPath(filePath);

    await this.#runFileAction({
      type: 'file',
      filePath: historyPath,
      content: JSON.stringify(history),
      changeSource: 'auto-save',
    } as any);
  }

  #getHistoryPath(filePath: string) {
    return nodePath.join('.history', filePath);
  }

  async #runBuildAction(action: ActionState) {
    if (action.type !== 'build') {
      unreachable('Expected build action');
    }

    // Trigger build started alert
    this.onDeployAlert?.({
      type: 'info',
      title: 'Building Application',
      description: 'Building your application...',
      stage: 'building',
      buildStatus: 'running',
      deployStatus: 'pending',
      source: 'netlify',
    });

    const buildService = await this.#buildService;
    const fs = await this.#aimpactFs;
    // Create a new terminal specifically for the build
    const buildResult = await buildService.runBuildScript('npm');

    const exitCode = buildResult.exitCode;

    if (!exitCode || exitCode !== 0) {
      // Trigger build failed alert
      this.onDeployAlert?.({
        type: 'error',
        title: 'Build Failed',
        description: 'Your application build failed',
        content: buildResult.output || 'No build output available',
        stage: 'building',
        buildStatus: 'failed',
        deployStatus: 'pending',
        source: 'netlify',
      });

      throw new ActionCommandError('Build Failed', buildResult.output || 'No Output Available');
    }

    // Trigger build success alert
    this.onDeployAlert?.({
      type: 'success',
      title: 'Build Completed',
      description: 'Your application was built successfully',
      stage: 'deploying',
      buildStatus: 'complete',
      deployStatus: 'running',
      source: 'netlify',
    });

    return {
      path: buildResult.path!,
      exitCode: buildResult.exitCode!,
      output: buildResult.output!,
    };
  }

  async handleSupabaseAction(action: SupabaseAction) {
    const { operation, content, filePath } = action;
    logger.debug('[Supabase Action]:', { operation, filePath, content });

    switch (operation) {
      case 'migration':
        if (!filePath) {
          throw new Error('Migration requires a filePath');
        }

        // Show alert for migration action
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Migration',
          description: `Create migration file: ${filePath}`,
          content,
          source: 'supabase',
        });

        // Only create the migration file
        await this.#runFileAction({
          type: 'file',
          filePath,
          content,
          changeSource: 'supabase',
        } as any);
        return { success: true };

      case 'query': {
        // Always show the alert and let the SupabaseAlert component handle connection state
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Query',
          description: 'Execute database query',
          content,
          source: 'supabase',
        });

        // The actual execution will be triggered from SupabaseChatAlert
        return { pending: true };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Add this method declaration to the class
  handleDeployAction(
    stage: 'building' | 'deploying' | 'complete',
    status: ActionStatus,
    details?: {
      url?: string;
      error?: string;
      source?: 'netlify' | 'vercel' | 'github';
    },
  ): void {
    if (!this.onDeployAlert) {
      logger.debug('No deploy alert handler registered');
      return;
    }

    const alertType = status === 'failed' ? 'error' : status === 'complete' ? 'success' : 'info';

    const title =
      stage === 'building'
        ? 'Building Application'
        : stage === 'deploying'
          ? 'Deploying Application'
          : 'Deployment Complete';

    const description =
      status === 'failed'
        ? `${stage === 'building' ? 'Build' : 'Deployment'} failed`
        : status === 'running'
          ? `${stage === 'building' ? 'Building' : 'Deploying'} your application...`
          : status === 'complete'
            ? `${stage === 'building' ? 'Build' : 'Deployment'} completed successfully`
            : `Preparing to ${stage === 'building' ? 'build' : 'deploy'} your application`;

    const buildStatus =
      stage === 'building' ? status : stage === 'deploying' || stage === 'complete' ? 'complete' : 'pending';

    const deployStatus = stage === 'building' ? 'pending' : status;

    this.onDeployAlert({
      type: alertType,
      title,
      description,
      content: details?.error || '',
      url: details?.url,
      stage,
      buildStatus: buildStatus as any,
      deployStatus: deployStatus as any,
      source: details?.source || 'netlify',
    });
  }
}
