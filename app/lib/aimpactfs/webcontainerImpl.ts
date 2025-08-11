import  { type AimpactFs } from '~/lib/aimpactfs/filesystem';
import { type BufferEncoding, type TextSearchMatch, WebContainer } from '@webcontainer/api';
import type {
  PathWatcherEvent,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';

export class WebcontainerFs implements AimpactFs {
  private readonly containerPromise: Promise<WebContainer>;

  constructor(containerPromise: Promise<WebContainer>) {
    this.containerPromise = containerPromise;
  }

  async mkdir(dirPath: string, options: { recursive: true }): Promise<string> {
    const container = await this.containerPromise;
    return container.fs.mkdir(dirPath, options);
  }

  async readFile(filePath: string, encoding: BufferEncoding): Promise<string> {
    const container = await this.containerPromise;
    return container.fs.readFile(filePath, encoding);
  }

  async readdir(dirPath: string, options?: {
    encoding?: BufferEncoding | null;
    withFileTypes?: false
  } | BufferEncoding | null): Promise<string[]> {
    const container = await this.containerPromise;
    return container.fs.readdir(dirPath, options);
  }

  async rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    console.log("Removing file:", filePath, "with options:", options);
    const container = await this.containerPromise;
    return container.fs.rm(filePath, options);
  }

  async textSearch(pattern: string, options?: Partial<TextSearchOptions>, onProgress?: TextSearchOnProgressCallback): Promise<Map<string, TextSearchMatch[]>> {
    const container = await this.containerPromise;
    return container.internal.textSearch(pattern, options, onProgress);
  }

  async watchPaths(options: WatchPathsOptions, cb: (events: PathWatcherEvent[]) => void): Promise<void> {
    const container = await this.containerPromise;
    container.internal.watchPaths(options, cb);
  }

  async workdir(): Promise<string> {
    const container = await this.containerPromise;
    return container.workdir;
  }

  async writeFile(filePath: string, content: string | Uint8Array, options?: string | {
    encoding?: string | null
  } | null): Promise<void> {
    const container = await this.containerPromise;
    return container.fs.writeFile(filePath, content, options);
  }
}
