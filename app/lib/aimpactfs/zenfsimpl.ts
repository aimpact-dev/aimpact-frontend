import { AimpactFs } from '~/lib/aimpactfs/filesystem';
import type {
  BufferEncoding, DirEnt,
  PathWatcherEvent, TextSearchMatch,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';
import {
  configureSingle, Dirent, fs, InMemory
} from '@zenfs/core';
import type { Backend } from '@zenfs/core';
import { minimatch } from 'minimatch';

/**
 * ZenFS implementation of AimpactFs that uses ZenFS local filesystem
 */
export class ZenfsImpl extends AimpactFs {
  private zenFsInitialized: boolean;
  private zenFsBackend: Backend<any, any>;
  private initializationPromise?: Promise<void>;
  private watchCallbacks: Map<WatchPathsOptions, (events: PathWatcherEvent[]) => void> = new Map();

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

  private _getWatchPathCallbacks(path: string): ((events: PathWatcherEvent[]) => void)[] {
    const callbacks: ((events: PathWatcherEvent[]) => void)[] = [];
    for (const [options, cb] of this.watchCallbacks.entries()) {
      const included = options.include || [];
      const excluded = options.exclude || [];
      // Check if path matches at least one included pattern
      const isIncluded = included.some((pattern: string) => minimatch(path, pattern));
      // Check if path matches any excluded pattern
      const isExcluded = excluded.some((pattern: string) => minimatch(path, pattern));
      if (isIncluded && !isExcluded) {
        callbacks.push(cb);
      }
    }
    return callbacks;
  }

  private _fireEventsForPath(path: string, eventType: 'change' | 'add_file' | 'remove_file' | 'add_dir' | 'remove_dir' | 'update_directory'){
    //Check callbacks
    const callbacks = this._getWatchPathCallbacks(path);
    if (callbacks.length > 0) {
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
  }

  /**
   * Creates a directory at the specified path
   */
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
      console.error(`ZenFS mkdir error for ${dirPath}:`, error);
      throw error;
    }

    //Imitating file watcher event.
    this._fireEventsForPath('dirPath', 'add_dir');

    if(dirPath === '/') {
      return undefined; //Matching the webcontainer behavior
    }
    if (dirPath.startsWith('/')) {
      dirPath = dirPath.substring(1); // Remove leading slash for consistency
    }
    return dirPath.split('/')[0]; // Return the root of the created path
  }

  /*
   * Checks if a path is a directory
   */
  private async _isDir(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      fs.stat(path, (err: any, stats: fs.Stats) => {
        if (err) {
          console.warn(`ZenFS isDir error for ${path}:`, err);
          resolve(false);
        } else {
          resolve(stats.isDirectory());
        }
      });
    });
  }

  /*
  * Recursively lists all contents of a directory
  * Name of each dirent is path relative to the root of ZenFS (which is '')
   */
  private async _allContents(path: string): Promise<DirEnt<string>[]> {
    await this.ensureInitialized();
    const results: DirEnt<string>[] = [];
    const walk = async (currentPath: string, relPath: string) => {
      let dirents: DirEnt<string>[];
      try {
        dirents = await this.readdir(currentPath);
      } catch (e) {
        // Not a directory or does not exist
        return;
      }
      for (const dirent of dirents) {
        const childPath = currentPath === '/' ? `/${dirent.name}` : `${currentPath}/${dirent.name}`;
        const childRelPath = relPath ? `${relPath}/${dirent.name}` : dirent.name;
        results.push({
          name: childRelPath,
          isFile: dirent.isFile,
          isDirectory: dirent.isDirectory
        });
        if (dirent.isDirectory()) {
          await walk(childPath, childRelPath);
        }
      }
    };
    await walk(path, path === '/' ? '' : path.replace(/^\/+/, ''));
    return results;
  }

  /**
  * Promisified version of fs.exists
   */
  private async _exists (path: string) {
    return new Promise<boolean>((resolve) => fs.exists(path, resolve));
  }

  /**
   * Promisified version of fs.writeFile
   * Writes content to a file at the specified path with the given encoding
   */
  private async _writeFile (path: string, conent: string | Uint8Array, encoding?: BufferEncoding) {
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
  private async _readFile (path: string, enc: BufferEncoding) {
    return new Promise<string>((resolve, reject) => {
      fs.readFile(path, { encoding: enc }, (err: any, data: string) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }


  /**
   * Reads a file from the specified path
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

  /**
   * Lists objects (files and folders) in a directory
   */
  async readdir(path: string): Promise<DirEnt<string>[]> {
    await this.ensureInitialized();

    // Fall back to ZenFS if Daytona fails
    try {
      const readdirPromise = new Promise((resolve, reject) => {
        const options = { withFileTypes: true };
        fs.readdir(path, options, (err: any, dirents: Dirent<string, ArrayBufferLike>[]) => {
          if (err) reject(err);
          else {
            console.log("Dirents:", dirents);
            resolve(dirents);
          }
        });
      });
      const dirents = await readdirPromise;
      // Convert fs.Dirent[] to DirEnt<string>[]
      const entries: DirEnt<string>[] = dirents.map((dirent) => {
        return {
          name: dirent.name,
          isFile: () => dirent.isFile(),
          isDirectory: () => dirent.isDirectory(),
        } as DirEnt<string>;
      });
      return entries;
    } catch (error) {
      console.error(`ZenFS readdir error for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Removes a file or directory
   */
  async rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    await this.ensureInitialized();

    //Tracking the removed content so we can fire file watcher events accordingly
    const removedContent: DirEnt<string>[] = [];
    const isDir = await this._isDir(filePath);
    removedContent.push({
      name: filePath,
      isFile: () => !isDir,
      isDirectory: () => isDir
    } as DirEnt<string>);
    if (isDir) {
      const contents = await this._allContents(filePath);
      for (const entry of contents) {
        removedContent.push(entry);
      }
    }

    const rmPromise = new Promise((resolve, reject) => {
      fs.rm(filePath, options, (err: any) => {
        if (err) {
          console.warn(`ZenFS rm error for ${filePath}:`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    try {
      await rmPromise;
      //Imitating file watcher events for each removed entry
      for (const entry of removedContent) {
        const eventType = entry.isDirectory() ? 'remove_dir' : 'remove_file';
        this._fireEventsForPath(entry.name, eventType);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Searches for text in files
   */
  async textSearch(pattern: string, options?: Partial<TextSearchOptions>, onProgress?: TextSearchOnProgressCallback): Promise<Map<string, TextSearchMatch[]>> {
    return new Map();
  }

  /**
   * Sets up file watching
   */
  async watchPaths(options: WatchPathsOptions, cb: (events: PathWatcherEvent[]) => void): Promise<void> {
    this.watchCallbacks.set(options, cb);
    return;
  }

  /**
   * In webcontainer the workdir was something like '/home/somekindofhash'
   * In ZenFS we can use the root directory
   */
  async workdir(): Promise<string> {
    return '';
  }

  /**
   * Writes a file to the specified path
   */
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
      const fileExists = await this._exists(filePath);
      await this._writeFile(filePath, content, encoding);
      if (fileExists) {
        this._fireEventsForPath(filePath, 'change');
      }
      else {
        this._fireEventsForPath(filePath, 'add_file');
      }
    }
    catch (error) {
      console.error(`ZenFS writeFile error for ${filePath}:`, error);
      throw error;
    }
  }
}
