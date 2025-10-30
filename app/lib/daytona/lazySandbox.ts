import { Daytona, type FileInfo, Image, type Sandbox, type SearchFilesResponse } from '@daytonaio/sdk';
import type { Command, ExecuteResponse, SessionExecuteRequest, SessionExecuteResponse } from '@daytonaio/api-client';
import { Buffer } from 'buffer';
import { lookup } from 'mime-types';
import type { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';

const DAYTONA_WORK_DIR = '/home/daytona';

/**
 * Lazily initializes daytona sandbox upon the first use
 */
export class LazySandbox implements AimpactSandbox {
  private readonly apiKey: string;
  private readonly orgId: string;
  private readonly apiUrl: string;
  private readonly previewProxyUrl: string;
  private sandboxId: string | null = null;
  private sandboxPromise: Promise<Sandbox> | null = null;
  private dependenciesPromise: Promise<void> | null = null;


  public constructor(apiUrl: string, apiKey: string, orgId: string, previewProxyUrl: string, sandboxId: string | null = null) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.orgId = orgId;
    this.previewProxyUrl = previewProxyUrl;
    this.sandboxId = sandboxId;
  }

  private getSandboxPromise(): Promise<Sandbox>{
    if (this.sandboxPromise) {
      return this.sandboxPromise;
    }
    this.sandboxPromise = this.createSandbox();
    return this.sandboxPromise;
  }

  private async ensureDependenciesInstalled(): Promise<void> {
    if(!this.dependenciesPromise) {
      this.dependenciesPromise = this.installDependencies();
    }
    return this.dependenciesPromise;
  }

  private async createSandbox() : Promise<Sandbox>{
    const daytona = new Daytona({
      apiKey: this.apiKey,
    });
    if(this.sandboxId){
      const existingSandbox = await daytona.get(this.sandboxId);
      return existingSandbox;
    }
    const resources = {
      cpu: 1,
      memory: 2,
      disk: 3
    };
    const image = Image.base('node:20-alpine').workdir(DAYTONA_WORK_DIR);
    const sandbox = await daytona.create({
      language: 'typescript',
      image: image,
      resources: resources,
      autoDeleteInterval: 0,
      public: true,
    });
    this.sandboxId = sandbox.id;
    console.log('Sandbox created with ID:', sandbox.id);
    return sandbox;
  }

  private async installDependencies(){
    const sandbox  = await this.getSandboxPromise();
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
  }

  /**
   * Resolves the path to the user's working directory and returns an absolute path.
   * @param path
   * @private
   */
  private resolvePath(path: string): string{
    if (!path.startsWith('/')) {
      return `${DAYTONA_WORK_DIR}/${path}`;
    }
    return path;
  }

  /**
   * Use this function to force lazy sandbox to initialize and get it id.
   * This function does not start dependencies installation.
   */
  async initialize(): Promise<string>{
    const sandbox = await this.getSandboxPromise();
    return sandbox.id;
  }

  async getPreviewLink(port: number){
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    console.log(`Getting preview link for port: ${port}`);
    const previewLink = await sandbox.getPreviewLink(port);
    console.log(`Got daytona preview link for port ${port}: ${JSON.stringify(previewLink)}`);
    const previewUrl = new URL(previewLink.url);
    console.log(`Retrieved preview url: ${previewUrl}`);
    console.log(`Creating proxy url from url string: ${this.previewProxyUrl}`);
    const proxyUrl = new URL(this.previewProxyUrl);
    console.log(`Retrieved proxy url: ${proxyUrl}`);
    const proxyProtocol = proxyUrl.protocol;
    const proxyPort = proxyUrl.port;
    const proxyHost = proxyUrl.hostname;
    const previewDomainParts = previewUrl.hostname.split('.');
    const leftDomainPart = previewDomainParts[0];
    const customHost = `${leftDomainPart}.${proxyHost}`;
    console.log(`Creating custom url from preview url string: ${previewUrl}`);
    const customPreviewUrl = new URL(previewUrl.toString());

    customPreviewUrl.protocol = proxyProtocol;
    customPreviewUrl.hostname = customHost;
    if (proxyPort) {
      customPreviewUrl.port = proxyPort;
    }
    previewLink.url = customPreviewUrl.toString();
    console.log(`Modified preview link for port ${port} to use proxy. New link: ${JSON.stringify(previewLink)}`);
    return previewLink;
  }

  async fileExists(filePath: string): Promise<boolean>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    filePath = this.resolvePath(filePath);
    const fileName = filePath.split('/').pop();
    if(!fileName){
      return false;
    }
    const dirPath = filePath.substring(0, filePath.length - fileName.length);
    const searchResult = await sandbox.fs.searchFiles(dirPath, fileName);
    if (!searchResult.files || searchResult.files.length === 0) {
      return false;
    }
    return searchResult.files.length > 0;
  }

  async createFolder(
    path: string,
    mode: string,
  ): Promise<void>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    path = this.resolvePath(path);
    return sandbox.fs.createFolder(path, mode);
  }

  async deleteFile(
    path: string,
  ): Promise<void>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    path = this.resolvePath(path);
    return sandbox.fs.deleteFile(path);
  }

  async executeCommand(
    command: string,
    cwd?: string,
    env?: Record<string, string>,
    timeout?: number,
  ): Promise<ExecuteResponse>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    return sandbox.process.executeCommand(command, cwd, env, timeout);
  }

  /**
   * Needed for the case when mime library cannot resolve the MIME type.
   * For some reason it can't resolve .tsx and .jsx right now.
   * @param fileName
   * @private
   */
  private mimeFallback(fileName: string): string | boolean {
    if (fileName.endsWith('.tsx')) {
      return 'application/typescript';
    }
    if (fileName.endsWith('.jsx')) {
      return 'application/javascript';
    }
    return false;
  }

  /**
   * The timeout parameter is ignored.
   * This methods call Daytona API directly, because SDK method `uploadFile` crashes for an unknown reason.
   * @param file
   * @param remotePath
   */
  async uploadFile(
    file: Buffer,
    remotePath: string,
  ): Promise<void>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    const fileName = remotePath.split('/').pop();
    if (!fileName) {
      throw new Error('Invalid remote path: file name is missing');
    }
    let mime = lookup(fileName);
    if(!mime){
      mime = this.mimeFallback(fileName);
      if (!mime) {
        throw new Error(`Could not determine MIME type for file: ${fileName}`);
      }
    }

    const baseUrl = `${this.apiUrl}/toolbox/${sandbox.id}/toolbox/files/upload`;
    const url = new URL(baseUrl);
    remotePath = this.resolvePath(remotePath);
    url.searchParams.append('path', remotePath);

    const formData = new FormData();
    const fileBlob = new Blob([file], { type: mime }); // Transform Buffer to Blob
    formData.append('file', fileBlob, fileName);

    const uploadResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Daytona-Organization-ID': this.orgId,
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const status = uploadResponse.status;
      const statusText = uploadResponse.statusText;
      const responseBody = await uploadResponse.text();

      throw new Error(`Failed to upload file: ${status} ${statusText}. Response body: ${responseBody}`);
    }
  }

  async searchFiles(
    path: string,
    pattern: string,
  ): Promise<SearchFilesResponse>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    path = this.resolvePath(path);
    return sandbox.fs.searchFiles(path, pattern);
  }

  async downloadFile(
    path: string,
    timeout?: number,
  ): Promise<Buffer> {
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    path = this.resolvePath(path);
    return sandbox.fs.downloadFile(path, timeout);
  }

  async listFiles(
    path: string,
  ): Promise<FileInfo[]>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    path = this.resolvePath(path);
    return sandbox.fs.listFiles(path);
  }

  async createSession(
    sessionId: string,
  ): Promise<void>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    return sandbox.process.createSession(sessionId);
  }

  async deleteSession(
    sessionId: string,
  ): Promise<void> {
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    return sandbox.process.deleteSession(sessionId);
  }

  async executeSessionCommand(
    sessionId: string,
    req: SessionExecuteRequest,
    timeout?: number,
  ): Promise<SessionExecuteResponse>{
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    //For some reason commands are executed in the /root directory by default instead of /home/daytona (daytona working directory)
    req.command = 'cd /home/daytona && ' + req.command;
    return sandbox.process.executeSessionCommand(sessionId, req, timeout);
  }

  async getSessionCommand(
    sessionId: string,
    commandId: string,
  ): Promise<Command> {
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    return sandbox.process.getSessionCommand(sessionId, commandId);
  }

  async getSessionCommandLogs(
    sessionId: string,
    commandId: string,
  ): Promise<string> {
    const sandbox = await this.getSandboxPromise();
    if (!sandbox) {
      throw new Error('Sandbox is not initialized');
    }
    await this.ensureDependenciesInstalled();

    return sandbox.process.getSessionCommandLogs(sessionId, commandId);
  }

  async dispose() {
    if (this.sandboxPromise){
      const sandbox = await this.sandboxPromise;
      await fetch(`${this.apiUrl}/sandbox/${sandbox.id}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Daytona-Organization-ID': this.orgId,
          'Content-Type': 'application/json'
        },
        keepalive: true  // This ensures the request completes even during page unload
      });
      console.log("Disposed sandbox:", sandbox.id);
    }
  }
}
