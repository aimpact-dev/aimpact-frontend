import { Daytona, type FileInfo, Image, type Sandbox, type SearchFilesResponse } from '@daytonaio/sdk';
import type { Command, ExecuteResponse, SessionExecuteRequest, SessionExecuteResponse } from '@daytonaio/api-client';


let daytonaApiUrl = import.meta.env.VITE_DAYTONA_API_URL || 'https://app.daytona.io/api';
let daytonaApiKey = import.meta.env.VITE_DAYTONA_API_KEY || '';
let daytonaOrgId = import.meta.env.VITE_DAYTONA_ORG_ID || '';

//Lazily initializes daytona sandbox upon the first use
//We don't want to have a daytona sandbox instance hanging while user doesn't need it.
export class LazySandbox{
  private sandbox: Sandbox | null = null;

  private async ensureSandboxInitialized(): Promise<Sandbox> {
    if (!this.sandbox) {
      this.sandbox = await this.initializeSandbox();
    }
    return this.sandbox;
  }

  private async initializeSandbox() : Promise<Sandbox>{
    const daytona = new Daytona({
      apiKey: import.meta.env.VITE_DAYTONA_API_KEY || '',
    });
    const resources = {
      cpu: 1,
      memory: 2,
      disk: 2
    };
    const image = Image.base('node:20-alpine').workdir('/home/daytona');
    const sandbox = await daytona.create({
      language: 'typescript',
      image: image,
      resources: resources,
      autoDeleteInterval: 0,
      public: true,
    });
    console.log('Sandbox created with ID:', sandbox.id);
    const corepackInstallResponse = await sandbox.process.executeCommand("npm install --global corepack@latest");
    if (corepackInstallResponse.exitCode !== 0) {
      console.error('Failed to install corepack:', corepackInstallResponse.result);
      throw new Error('Corepack installation failed');
    }
    console.log('Corepack installed successfully');
    const pnpmInstallResponse = await sandbox.process.executeCommand("corepack enable pnpm && corepack use pnpm@latest-10");
    if (pnpmInstallResponse.exitCode !== 0) {
      console.error('Failed to enable pnpm:', pnpmInstallResponse.result);
      throw new Error('PNPM enable failed');
    }
    return sandbox;
  }


  async getPreviewLink(port: number){
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.getPreviewLink(port);
  }

  async createFolder(
    path: string,
    mode: string,
  ): Promise<void>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.fs.createFolder(path, mode);
  }

  async deleteFile(
    path: string,
  ): Promise<void>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.fs.deleteFile(path);
  }

  async executeCommand(
    command: string,
    cwd?: string,
    env?: Record<string, string>,
    timeout?: number,
  ): Promise<ExecuteResponse>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.process.executeCommand(command, cwd, env, timeout);
  }

  async uploadFile(
    file: Buffer,
    remotePath: string,
    timeout?: number,
  ): Promise<void>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.fs.uploadFile(file, remotePath, timeout);
  }

  async searchFiles(
    path: string,
    pattern: string,
  ): Promise<SearchFilesResponse>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.fs.searchFiles(path, pattern);
  }

  async downloadFile(
    remotePath: string,
    timeout?: number,
  ): Promise<Buffer> {
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.fs.downloadFile(remotePath, timeout);
  }

  async listFiles(
    path: string,
  ): Promise<FileInfo[]>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.fs.listFiles(path);
  }

  async createSession(
    sessionId: string,
  ): Promise<void>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.process.createSession(sessionId);
  }

  async deleteSession(
    sessionId: string,
  ): Promise<void> {
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.process.deleteSession(sessionId);
  }

  async executeSessionCommand(
    sessionId: string,
    req: SessionExecuteRequest,
    timeout?: number,
  ): Promise<SessionExecuteResponse>{
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.process.executeSessionCommand(sessionId, req, timeout);
  }

  async getSessionCommand(
    sessionId: string,
    commandId: string,
  ): Promise<Command> {
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.process.getSessionCommand(sessionId, commandId);
  }

  async getSessionCommandLogs(
    sessionId: string,
    commandId: string,
  ): Promise<string> {
    const sandbox = await this.ensureSandboxInitialized();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    return sandbox.process.getSessionCommandLogs(sessionId, commandId);
  }

  /**
   * Removes daytona instance via keepalive API call, so it can be sent after page unload/reload.
   */
  dispose() {
    const sandboxId = this.sandbox?.id;
    if (!sandboxId) return;
    fetch(`${daytonaApiUrl}/sandbox/${sandboxId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${daytonaApiKey}`,
        'X-Daytona-Organization-ID': daytonaOrgId,
        'Content-Type': 'application/json'
      },
      keepalive: true  // This ensures the request completes even during page unload
    });
  }
}
