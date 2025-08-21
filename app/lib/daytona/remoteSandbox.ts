import Cookies from 'js-cookie';
import type {
  Command,
  ExecuteResponse,
  PortPreviewUrl,
  SessionExecuteRequest,
  SessionExecuteResponse
} from '@daytonaio/api-client';
import { Buffer } from 'buffer';
import type { FileInfo, SearchFilesResponse } from '@daytonaio/sdk';

/**
 * Imitates daytona API calls by calling actions from api.daytona.ts.
 */
export class RemoteSandbox{

  private async callApi(method: string, args: any, authToken: string): Promise<any> {
    const response = await fetch('/api/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        args,
        authToken: authToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status ${response.status}`);
    }

    return response.json();
  }

  private getAuthToken(): string{
    const authToken = Cookies.get('authToken');
    if (!authToken) {
      throw new Error('No auth token found in cookies');
    }
    return authToken;
  }

  async getPreviewLink(port: number): Promise<PortPreviewUrl>{
    const args = {
      port: port,
    };
    const authToken = this.getAuthToken();
    const response = await this.callApi('getPreviewLink', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to get preview link: ${response.error}`);
    }
    const data = response.data;
    if(!data.token || !data.url){
      throw new Error('Invalid response from getPreviewLink');
    }
    return {
      token: data.token,
      url: data.url,
    };
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
    const response = await this.callApi('createFolder', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to create folder: ${response.error}`);
    }
  }

  async deleteFile(
    path: string,
  ): Promise<void>{
    const args = {
      path: path,
    };
    const authToken = this.getAuthToken();

    const response = await this.callApi('deleteFile', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to delete file: ${response.error}`);
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

    const response = await this.callApi('executeCommand', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to execute command: ${response.error}`);
    }
    let responseParsed: ExecuteResponse;
    try {
      responseParsed = JSON.parse(response.data);
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
    console.log('Uploading buffer with: ', file.toString('base64'));
    const response = await this.callApi('uploadFile', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to upload file: ${response.error}`);
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
    const response = await this.callApi('searchFiles', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to search files: ${response.error}`);
    }
    let responseParsed: SearchFilesResponse;
    try {
      responseParsed = JSON.parse(response.data);
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
    const response = await this.callApi('downloadFile', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to download file: ${response.error}`);
    }
    if(!response.data || !response.data.fileContent){
      throw new Error('Invalid response from downloadFile');
    }
    return Buffer.from(response.data.fileContent, 'base64');
  }

  async listFiles(
    path: string,
  ): Promise<FileInfo[]>{
    const args = {
      path: path,
    }
    const authToken = this.getAuthToken();
    const response = await this.callApi('listFiles', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to list files: ${response.error}`);
    }
    let responseParsed: FileInfo[];
    try {
      responseParsed = JSON.parse(response.data);
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
    const response = await this.callApi('createSession', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to create session: ${response.error}`);
    }
  }

  async deleteSession(
    sessionId: string,
  ): Promise<void> {
    const args = {
      sessionId: sessionId,
    };
    const authToken = this.getAuthToken();
    const response = await this.callApi('deleteSession', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to delete session: ${response.error}`);
    }
  }

  async executeSessionCommand(
    sessionId: string,
    req: SessionExecuteRequest,
    timeout?: number,
  ): Promise<SessionExecuteResponse>{
    const args = {
      sessionId: sessionId,
      req: req,
      timeout: timeout,
    };
    const authToken = this.getAuthToken();
    const response = await this.callApi('executeSessionCommand', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to execute session command: ${response.error}`);
    }
    let responseParsed: SessionExecuteResponse;
    try {
      responseParsed = JSON.parse(response.data);
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
    const response = await this.callApi('getSessionCommand', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to get session command: ${response.error}`);
    }
    let responseParsed: Command;
    try {
      responseParsed = JSON.parse(response.data);
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
    const response = await this.callApi('getSessionCommandLogs', args, authToken);
    if(!response.ok){
      throw new Error(`Failed to get session command logs: ${response.error}`);
    }
    return response.data;
  }

  async dispose(){
    // We need to call dispose action via keepalive request
    const authToken = this.getAuthToken();
    const response = await fetch('/api/daytona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'dispose',
        authToken: authToken,
      }),
      keepalive: true, // This ensures the request completes even during page unload
    });
  }
}
