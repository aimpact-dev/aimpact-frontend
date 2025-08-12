import { AimpactFs } from '~/lib/aimpactfs/filesystem';
import type {
  BufferEncoding, DirEnt,
  PathWatcherEvent, TextSearchMatch,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';
import {
  configureSingle, fs, InMemory
} from '@zenfs/core';
import type { Backend } from '@zenfs/core';

/**
 * ZenFS implementation of AimpactFs that uses ZenFS local filesystem
 */
export class ZenfsImpl extends AimpactFs {
  private zenFsInitialized: boolean;
  private zenFsBackend: Backend<any, any>;
  private initializationPromise?: Promise<void>;

  /**
   * Creates a new ZenfsImpl instance with the specified backend
   * @param backend Backend to use for local storage (defaults to InMemory)
   */
  constructor(backend: Backend<any, any> = InMemory) {
    super();
    this.zenFsBackend = backend;
    this.zenFsInitialized = false;

    // Initialize ZenFS and Daytona
    this.initializationPromise = this.initialize().catch(err => {
      console.error('Failed to initialize ZenfsImpl:', err);
    });
  }

  private async initialize(): Promise<void> {
    try {
      await configureSingle({
        backend: this.zenFsBackend,
        options: { name: 'aimpact-zenfs' }
      });
      this.zenFsInitialized = true;
      console.log('ZenFS initialized with backend:', this.zenFsBackend.name);
    } catch (error) {
      this.zenFsInitialized = false;
      this.initializationPromise = undefined;
      console.error('Error during initialization:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.zenFsInitialized) return;
    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }
    await this.initializationPromise;
  }

  /*
* Promisified version of fs.exists
 */
  async _exists (path: string) {
    return new Promise<boolean>((resolve) => fs.exists(path, resolve));
  }

  /**
   * Promisified version of fs.writeFile
   * Writes content to a file at the specified path with the given encoding
   */
  async _writeFile (path: string, conent: string | Uint8Array, encoding?: BufferEncoding) {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, conent, encoding, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Promisified version of fs.readFile
   * Reads a file from the specified path with the given encoding
   */
  async _readFile (path: string, enc: BufferEncoding) {
    return new Promise<string>((resolve, reject) => {
      fs.readFile(path, { encoding: enc }, (err: any, data: string) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }


  /**
   * Reads a file from the specified path
   *
   */
  async readFile(filePath: string, encoding: BufferEncoding): Promise<string> {
    await this.ensureInitialized();

    const exists = await this._exists(filePath);
    if (!exists) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    try {
      const content = await this._readFile(filePath, encoding);
      return content;
    }
    catch (error) {
      console.warn(`ZenFS readFile error for ${filePath}:`, error);
      throw error;
    }
  }

  async mkdir(dirPath: string): Promise<string> {
    await this.ensureInitialized();

    try {
      await new Promise<void>((resolve, reject) => {
        fs.mkdir(dirPath, { recursive: true }, (err: any) => {
          if (err) {
            console.warn(`ZenFS mkdir error for ${dirPath}:`, err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`Failed to create directory ${dirPath} in ZenFS:`, error);
      throw error;
    }

    if(dirPath === '/') {
      return undefined; //Matching the webcontainer behavior
    }
    if (dirPath.startsWith('/')) {
      dirPath = dirPath.substring(1); // Remove leading slash for consistency
    }
    return dirPath.split('/')[0]; // Return the root of the created path
  }

  async readdir(path: string, options: { encoding?: BufferEncoding | null; withFileTypes: true }): Promise<DirEnt<string>[]> {
    return []
  }

  async rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    return;
  }

  async textSearch(pattern: string, options?: Partial<TextSearchOptions>, onProgress?: TextSearchOnProgressCallback): Promise<Map<string, TextSearchMatch[]>> {
    return new Map();
  }

  async watchPaths(options: WatchPathsOptions, cb: (events: PathWatcherEvent[]) => void): Promise<void> {

  }

  async workdir(): Promise<string> {
    return '/';
  }

  async writeFile(filePath: string, content: string | Uint8Array, encoding?: BufferEncoding): Promise<void> {
    await this.ensureInitialized();

    //If filePath contains directories, ensure the parent directory exists
    if(!filePath.indexOf('/') === -1) {
      const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
      const exists = await this._exists(parentDir);
      if (!exists) {
        throw new Error(`Parent directory does not exist: ${parentDir}`);
      }
    }

    try {
      await this._writeFile(filePath, content, encoding);
    }
    catch (error) {
      console.error(`ZenFS writeFile error for ${filePath}:`, error);
      throw error;
    }
  }
}
