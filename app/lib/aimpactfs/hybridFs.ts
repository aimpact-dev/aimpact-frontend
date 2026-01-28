import {AimpactFs} from "./filesystem";
import type {
  BufferEncoding,
  DirEnt,
  TextSearchMatch,
  TextSearchOnProgressCallback,
  TextSearchOptions, WatchPathsOptions
} from "@webcontainer/api";
import type { PathWatcherEvent } from './types';
import type { ZenfsImpl } from '~/lib/aimpactfs/zenfsimpl.client';
import { WatchPathsCallbacks } from '~/lib/aimpactfs/WatchPathsCallbacks';
import { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';

const DAYTONA_WORK_DIR = '/home/daytona';

export class HybridFs extends AimpactFs {
  private readonly zenfs: ZenfsImpl;
  private readonly sandboxPromise: Promise<AimpactSandbox>;
  //This map is only for pre_add_file and pre_add_dir events
  //Other events are handled in zenfs implementation.
  private watchCallbacks: WatchPathsCallbacks = new WatchPathsCallbacks();

  constructor(zenfs: ZenfsImpl, sandboxPromise: Promise<AimpactSandbox>) {
    super();
    this.zenfs = zenfs;
    this.sandboxPromise = sandboxPromise;
  }

  private async toDaytonaPath(path: string): Promise<string> {
    const zenfsWorkdir = await this.zenfs.workdir();
    if (zenfsWorkdir && path.startsWith(zenfsWorkdir)) {
      // Replace zenfs workdir with Daytona's home directory
      return DAYTONA_WORK_DIR + path.slice(zenfsWorkdir.length);
    }
    return path;
  }

  //This function is used to fire events for pre_add_file and pre_add_dir
  //Other types of events are handled in zenfs implementation.
  private fireEventsForPath(path: string, eventType: 'change' | 'add_file' | 'pre_add_file' | 'remove_file' | 'add_dir' | 'pre_add_dir' | 'remove_dir' | 'update_directory'){
    if (eventType !== 'pre_add_dir' && eventType !== 'pre_add_file') return;
    const callbacks = this.watchCallbacks.getCallbacksForPath(path);
    if (callbacks.length === 0) return;
    const event: PathWatcherEvent = {
      type: eventType,
      path: path
    }
    for (const cb of callbacks) {
      try {
        cb([event]);
      } catch (error) {
        console.error(`Error in watch callback for ${path}:`, error);
      }
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    const existsLocally = await this.zenfs.exists(this.zenfs.toLocalPath(filePath));
    const sandbox = await this.sandboxPromise;
    const existsInSandbox = await sandbox.fileExists(await this.toDaytonaPath(filePath));
    return existsLocally && existsInSandbox;
  }

  async mkdir(dirPath: string): Promise<string> {
    if(!await this.zenfs.exists(this.zenfs.toLocalPath(dirPath))) {
      this.fireEventsForPath(this.zenfs.toLocalPath(dirPath), 'pre_add_dir');
    }
    const sandbox = await this.sandboxPromise;
    await sandbox.createFolder(await this.toDaytonaPath(dirPath), '755')
    return this.zenfs.mkdir(dirPath);
  }

  async readFile(filePath: string, encoding: BufferEncoding): Promise<string> {
    return this.zenfs.readFile(filePath, encoding);
  }

  async readdir(path: string): Promise<DirEnt<string>[]>{
    return this.zenfs.readdir(path);
  }

  async rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    const sandbox = await this.sandboxPromise;
    const daytonaPath = await this.toDaytonaPath(filePath);
    if(options && options.recursive) {
      const rmCommand = "rm -rf " + daytonaPath;
      await sandbox.executeCommand(rmCommand, DAYTONA_WORK_DIR);
    }
    else {
      await sandbox.deleteFile(daytonaPath);
    }

    return this.zenfs.rm(filePath, options);
  }

  async textSearch(pattern: string, options?: Partial<TextSearchOptions>, onProgress?: TextSearchOnProgressCallback): Promise<Map<string, TextSearchMatch[]>> {
    return this.zenfs.textSearch(pattern, options, onProgress);
  }

  async watchPaths(options: WatchPathsOptions, cb: (events: PathWatcherEvent[]) => void): Promise<void> {
    this.watchCallbacks.addCallback(options, cb);
    return this.zenfs.watchPaths(options, cb);
  }

  async workdir(): Promise<string> {
    return this.zenfs.workdir();
  }

  async writeFile(filePath: string, content: string | Uint8Array, encoding?: BufferEncoding): Promise<void> {
    if(!await this.zenfs.exists(this.zenfs.toLocalPath(filePath))) {
      this.fireEventsForPath(this.zenfs.toLocalPath(filePath), 'pre_add_file');
    }
    const sandbox = await this.sandboxPromise;
    const buffer = Buffer.from(content);
    await sandbox.uploadFile(buffer, await this.toDaytonaPath(filePath));
    await this.zenfs.writeFile(filePath, content, encoding);
  }

  async mkdirLocal(dirPath: string): Promise<string> {
    return this.zenfs.mkdir(dirPath);
  }

  async writeFileLocal(filePath: string, content: string | Uint8Array, encoding?: BufferEncoding): Promise<void> {
    return this.zenfs.writeFile(filePath, content, encoding);
  }

  async rmLocal(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    return this.zenfs.rm(filePath, options);
  }
}
