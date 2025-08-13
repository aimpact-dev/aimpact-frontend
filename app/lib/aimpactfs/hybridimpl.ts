import {AimpactFs} from "./filesystem";
import type {
  BufferEncoding,
  DirEnt, PathWatcherEvent,
  TextSearchMatch,
  TextSearchOnProgressCallback,
  TextSearchOptions, WatchPathsOptions
} from "@webcontainer/api";
import {Sandbox} from "@daytonaio/sdk";

export class HybridImpl extends AimpactFs {
  private readonly zenfs: AimpactFs;
  private readonly sandboxPromise: Promise<Sandbox>;

  constructor(zenfs: AimpactFs, sandboxPromise: Promise<Sandbox>) {
    super();
    this.zenfs = zenfs;
    this.sandboxPromise = sandboxPromise;
  }

  private toDaytonaPath(path: string): string {
    if (path.startsWith('/')) {
      return "/home/daytona" + path;
    }
    return path;
  }

  async mkdir(dirPath: string): Promise<string> {
    const result = await this.zenfs.mkdir(dirPath);
    const sandbox = await this.sandboxPromise;
    await sandbox.fs.createFolder(this.toDaytonaPath(dirPath), '755')
    return result;
  }

  async readFile(filePath: string, encoding: BufferEncoding): Promise<string> {
    return this.zenfs.readFile(filePath, encoding);
  }

  async readdir(path: string): Promise<DirEnt<string>[]>{
    return this.zenfs.readdir(path);
  }

  async rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    const sandbox = await this.sandboxPromise;
    if(options && options.recursive) {
      const daytonaPath = this.toDaytonaPath(filePath);
      const rmCommand = "rm -rf " + daytonaPath;
      await sandbox.process.executeCommand(rmCommand, "/home/daytona/");
    }
    else {
      await sandbox.fs.deleteFile(filePath);
    }

    return this.zenfs.rm(filePath, options);
  }

  async textSearch(pattern: string, options?: Partial<TextSearchOptions>, onProgress?: TextSearchOnProgressCallback): Promise<Map<string, TextSearchMatch[]>> {
    return this.zenfs.textSearch(pattern, options, onProgress);
  }

  async watchPaths(options: WatchPathsOptions, cb: (events: PathWatcherEvent[]) => void): Promise<void> {
    return this.zenfs.watchPaths(options, cb);
  }

  async workdir(): Promise<string> {
    return this.zenfs.workdir();
  }

  async writeFile(filePath: string, content: string | Uint8Array, encoding?: BufferEncoding): Promise<void> {
    const sandbox = await this.sandboxPromise;
    const buffer = Buffer.from(content);
    await sandbox.fs.uploadFile(buffer, this.toDaytonaPath(filePath));
    return this.zenfs.writeFile(filePath, content, encoding);
  }
}
