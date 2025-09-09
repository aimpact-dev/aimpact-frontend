import type {
  Command,
  ExecuteResponse,
  PortPreviewUrl,
  SessionExecuteRequest,
  SessionExecuteResponse
} from '@daytonaio/api-client';
import { Buffer } from 'buffer';
import type { FileInfo, SearchFilesResponse } from '@daytonaio/sdk';
import { getAuthTokenFromCookies, useAuth } from '~/lib/hooks/useAuth';
import type { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';

/**
 * Imitates daytona API calls by calling actions from api.daytona.ts.
 */
export class RemoteSandbox implements AimpactSandbox {
  private readonly uuid: string = crypto.randomUUID();
  private cachedToken: string | null = null;
  private remoteSandboxCreated: boolean = false;

  private async callApi(method: string, args: any, authToken: string){
    const response = await fetch('/api/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        args,
        authToken: authToken,
        uuid: this.uuid,
      }),
    });

    return response;
  }

  private async callRemoteSandbox(method: string, args: any, authToken: string): Promise<Response> {
    if (!this.remoteSandboxCreated){
      const createResponse = await this.callApi('createSandbox', {}, authToken);
      if (!createResponse.ok){
        // Error responses are handled by the caller
        return createResponse;
      }
      this.remoteSandboxCreated = true;
    }
    return this.callApi(method, args, authToken);
  }

  private getAuthToken(): string{
    const authToken = getAuthTokenFromCookies();
    if (!authToken) {
      throw new Error('Not authorized');
    }
    this.cachedToken = authToken;
    return authToken;
  }

  async getPreviewLink(port: number): Promise<PortPreviewUrl>{
    const args = {
      port: port,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('getPreviewLink', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to get preview link: ${response.statusText}`);
    }
    const data = await response.json();
    if(!data.token || !data.url){
      throw new Error('Invalid response from getPreviewLink');
    }
    return {
      token: data.token,
      url: data.url,
    };
  }

  async fileExists(file: string): Promise<boolean>{
    const args = {
      filePath: file,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('fileExists', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to check if file exists: ${response.statusText}. Response content: ${await response.text()}`);
    }
    let responseParsed: { exists: boolean };
    try {
      responseParsed = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse file exists response: ${e}`);
    }
    return responseParsed.exists;
  }

  async createFolder(
    path: string,
    mode: string,
  ): Promise<void>{
    const args = {
      path: path,
      mode: mode,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('createFolder', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }
  }

  async deleteFile(
    path: string,
  ): Promise<void>{
    const args = {
      path: path,
    };
    const authToken = this.getAuthToken();

    const response = await this.callRemoteSandbox('deleteFile', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  async executeCommand(
    command: string,
    cwd?: string,
    env?: Record<string, string>,
    timeout?: number,
  ): Promise<ExecuteResponse>{
    const args = {
      command: command,
      cwd: cwd,
      env: env,
      timeout: timeout,
    };
    const authToken = this.getAuthToken();

    const response = await this.callRemoteSandbox('executeCommand', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to execute command: ${response.statusText}`);
    }
    let responseParsed: ExecuteResponse;
    try {
      responseParsed = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse execute command response: ${e}`);
    }

    return responseParsed;
  }

  async uploadFile(
    file: Buffer,
    remotePath: string,
    timeout?: number,
  ): Promise<void>{
    const args = {
      file: file.toString('base64'),
      remotePath: remotePath,
      timeout: timeout,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('uploadFile', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }
  }

  async searchFiles(
    path: string,
    pattern: string,
  ): Promise<SearchFilesResponse>{
    const args = {
      path: path,
      pattern: pattern,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('searchFiles', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to search files: ${response.statusText}`);
    }
    let responseParsed: SearchFilesResponse;
    try {
      responseParsed = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse search files response: ${e}`);
    }
    return responseParsed;
  }

  async downloadFile(
    remotePath: string,
    timeout?: number,
  ): Promise<Buffer> {
    const args = {
      remotePath: remotePath,
      timeout: timeout,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('downloadFile', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    let fileContent: string; //Base64 encoded file content
    try {
      const json = await response.json();
      fileContent = json.fileContent;
    } catch (e) {
      throw new Error(`Failed to read file content: ${e}`);
    }
    return Buffer.from(fileContent, 'base64');
  }

  async listFiles(
    path: string,
  ): Promise<FileInfo[]>{
    const args = {
      path: path,
    }
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('listFiles', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    let responseParsed: FileInfo[];
    try {
      responseParsed = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse list files response: ${e}`);
    }
    return responseParsed;
  }

  async createSession(
    sessionId: string,
  ): Promise<void>{
    const args = {
      sessionId: sessionId,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('createSession', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to create session: ${response.statusText}`);
    }
  }

  async deleteSession(
    sessionId: string,
  ): Promise<void> {
    const args = {
      sessionId: sessionId,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('deleteSession', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  }

  async executeSessionCommand(
    sessionId: string,
    req: SessionExecuteRequest,
    timeout?: number,
  ): Promise<SessionExecuteResponse>{
    const args = {
      sessionId: sessionId,
      request: req,
      timeout: timeout,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('executeSessionCommand', args, authToken);
    if(!response.ok){
      const responseText = await response.text();
      throw new Error(`Failed to execute session command. Status: ${response.statusText}. Response: ${responseText}`);
    }
    let responseParsed: SessionExecuteResponse;
    try {
      responseParsed = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse execute session command response: ${e}`);
    }
    return responseParsed;
  }

  async getSessionCommand(
    sessionId: string,
    commandId: string,
  ): Promise<Command> {
    const args = {
      sessionId: sessionId,
      commandId: commandId,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('getSessionCommand', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to get session command: ${response.statusText}`);
    }
    let responseParsed: Command;
    try {
      responseParsed = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse get session command response: ${e}`);
    }
    return responseParsed;
  }

  async getSessionCommandLogs(
    sessionId: string,
    commandId: string,
  ): Promise<string> {
    const args = {
      sessionId: sessionId,
      commandId: commandId,
    };
    const authToken = this.getAuthToken();
    const response = await this.callRemoteSandbox('getSessionCommandLogs', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to get session command logs: ${response.statusText}`);
    }
    return response.text();
  }

  dispose(){
    // We need to call dispose action via keepalive request
    fetch('/api/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'dispose',
        authToken: this.cachedToken,
        uuid: this.uuid,
      }),
      keepalive: true, // This ensures the request completes even during page unload
    });
  }
}
