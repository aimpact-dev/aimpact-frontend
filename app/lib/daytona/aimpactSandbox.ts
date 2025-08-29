import type {
  Command,
  ExecuteResponse,
  PortPreviewUrl,
  SessionExecuteRequest,
  SessionExecuteResponse
} from '@daytonaio/api-client';
import { Buffer } from 'buffer';
import type { FileInfo, SearchFilesResponse } from '@daytonaio/sdk';

// Interface for wrapper classes around Daytona Sandbox
export abstract class AimpactSandbox {

  abstract getPreviewLink(port: number): Promise<PortPreviewUrl>;

  abstract fileExists(filePath: string): Promise<boolean>;

  abstract createFolder(
    path: string,
    mode: string,
  ): Promise<void>;

  abstract deleteFile(
    path: string,
  ): Promise<void>;

  abstract executeCommand(
    command: string,
    cwd?: string,
    env?: Record<string, string>,
    timeout?: number,
  ): Promise<ExecuteResponse>;

  abstract uploadFile(
    file: Buffer,
    remotePath: string,
    timeout?: number,
  ): Promise<void>;

  abstract searchFiles(
    path: string,
    pattern: string,
  ): Promise<SearchFilesResponse>;

  abstract downloadFile(
    remotePath: string,
    timeout?: number,
  ): Promise<Buffer>;

  abstract listFiles(
    path: string,
  ): Promise<FileInfo[]>;

  abstract createSession(
    sessionId: string,
  ): Promise<void>;

  abstract deleteSession(
    sessionId: string,
  ): Promise<void>;

  abstract executeSessionCommand(
    sessionId: string,
    req: SessionExecuteRequest,
    timeout?: number,
  ): Promise<SessionExecuteResponse>;

  abstract getSessionCommand(
    sessionId: string,
    commandId: string,
  ): Promise<Command>;

  abstract getSessionCommandLogs(
    sessionId: string,
    commandId: string,
  ): Promise<string>;

  abstract dispose(): void;
}
