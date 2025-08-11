import { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { getSandbox } from '~/lib/daytona';
import { Sandbox } from '@daytonaio/sdk';
import type {
  BufferEncoding, DirEnt,
  PathWatcherEvent, TextSearchMatch,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';
import {
  configureSingle, fs, InMemory, Backend
} from '@zenfs/core';

/**
 * ZenFS implementation of AimpactFs that uses both ZenFS local filesystem
 * and Daytona remote filesystem.
 *
 * This allows for fast local operations (especially searches) while also
 * enabling remote code execution in Daytona.
 */
export class ZenfsImpl extends AimpactFs {
  private sandboxPromise: Promise<Sandbox>;
  private zenFsInitialized: boolean;
  private zenFsBackend: Backend<any, any>;

  /**
   * Creates a new ZenfsImpl instance with the specified backend
   * @param backend Backend to use for local storage (defaults to InMemory)
   */
  constructor(backend: Backend<any, any> = InMemory) {
    super();
    this.zenFsBackend = backend;
    this.zenFsInitialized = false;
    this.sandboxPromise = getSandbox();

    // Initialize ZenFS and Daytona
    this.initialize().catch(err => {
      console.error('Failed to initialize ZenfsImpl:', err);
    });
  }

  /**
   * Initialize ZenFS and Daytona connections
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize ZenFS with the specified backend
      await configureSingle({
        backend: this.zenFsBackend,
        options: { name: 'aimpact-zenfs' }
      });
      this.zenFsInitialized = true;
      console.log('ZenFS initialized with backend:', this.zenFsBackend.name);

      // Initialize Daytona
      const sandbox = await this.sandboxPromise;
      await sandbox.start();
      console.log('Daytona sandbox started');
    } catch (error) {
      console.error('Error during initialization:', error);
      throw error;
    }
  }

  /**
   * Ensures that ZenFS is initialized before proceeding
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.zenFsInitialized) {
      await this.initialize();
    }
  }

  /**
   * Creates a directory at the specified path
   */
  async mkdir(dirPath: string, options: { recursive: true }): Promise<string> {
    await this.ensureInitialized();

    // Create directory in ZenFS
    try {
      fs.mkdirSync(dirPath, options);
    } catch (error) {
      console.warn(`ZenFS mkdir error for ${dirPath}:`, error);
      // Ignore if directory already exists
    }

    // Create directory in Daytona
    try {
      const sandbox = await this.sandboxPromise;

      // Daytona uses createFolder with mode parameter
      const mode = "755"; // Default directory permissions

      if (options?.recursive) {
        // Create all parent directories if they don't exist
        const parts = dirPath.split('/').filter(Boolean);
        let currentPath = '/';

        for (const part of parts) {
          currentPath = `${currentPath}${part}/`;
          const pathToCreate = currentPath.slice(0, -1); // Remove trailing slash
          try {
            await sandbox.fs.createFolder(pathToCreate, mode);
          } catch (err) {
            // Ignore if directory already exists
            if (!String(err).includes('already exists')) {
              console.warn(`Daytona mkdir error for ${pathToCreate}:`, err);
            }
          }
        }
      } else {
        await sandbox.fs.createFolder(dirPath, mode);
      }
    } catch (error) {
      console.warn(`Failed to create directory ${dirPath} in Daytona:`, error);
    }

    return dirPath;
  }

  /**
   * Reads a file from the specified path
   */
  async readFile(filePath: string, encoding: BufferEncoding): Promise<string> {
    await this.ensureInitialized();

    // Try to read from ZenFS first (for speed)
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, encoding);
      }
    } catch (error) {
      console.warn(`ZenFS readFile error for ${filePath}:`, error);
    }

    // Fall back to reading from Daytona
    try {
      const sandbox = await this.sandboxPromise;
      // Daytona's downloadFile returns a Buffer
      const fileContent = await sandbox.fs.downloadFile(filePath);
      // Convert Buffer to string using specified encoding
      const content = fileContent.toString(encoding as BufferEncoding);

      // Cache file in ZenFS for future reads
      try {
        // Ensure parent directory exists
        const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
        if (parentDir) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, encoding);
      } catch (cacheError) {
        console.warn(`Failed to cache file ${filePath} in ZenFS:`, cacheError);
      }

      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath} from Daytona:`, error);
      throw error;
    }
  }

  /**
   * Lists files in a directory
   */
  async readdir(path: string, options: { encoding?: BufferEncoding | null; withFileTypes: true }): Promise<DirEnt<string>[]> {
    await this.ensureInitialized();

    try {
      // Get directory content from Daytona (more authoritative)
      const sandbox = await this.sandboxPromise;
      // Daytona's listFiles method returns FileInfo[]
      const files = await sandbox.fs.listFiles(path);

      // Cache directory structure in ZenFS
      try {
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
        }
      } catch (cacheError) {
        console.warn(`Failed to cache directory ${path} in ZenFS:`, cacheError);
      }

      // Convert to expected DirEnt format
      return files.map(file => {
        return {
          name: file.name,
          isDirectory: () => file.isDir,
          isFile: () => !file.isDir,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          isSymbolicLink: () => false
        } as DirEnt<string>;
      });
    } catch (error) {
      console.error(`Daytona readdir error for ${path}:`, error);

      // Fall back to ZenFS if Daytona fails
      try {
        const entries = fs.readdirSync(path, options);
        return entries;
      } catch (fsError) {
        console.error(`ZenFS readdir error for ${path}:`, fsError);
        throw error; // Throw the original error
      }
    }
  }

  /**
   * Removes a file or directory
   */
  async rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    await this.ensureInitialized();

    // Remove from ZenFS
    try {
      fs.rmSync(filePath, options);
    } catch (error) {
      console.warn(`ZenFS rm error for ${filePath}:`, error);
    }

    // Remove from Daytona
    try {
      const sandbox = await this.sandboxPromise;
      try {
        const fileInfo = await sandbox.fs.getFileDetails(filePath);
        if (fileInfo.isDir) {
          // Daytona uses deleteFile for directories
          await sandbox.fs.deleteFile(filePath);
        } else {
          // Daytona uses deleteFile for files
          await sandbox.fs.deleteFile(filePath);
        }
      } catch (fileInfoError) {
        // If we can't get file info, try both operations
        try {
          await sandbox.fs.deleteFile(filePath);
        } catch (fileError) {
          try {
            await sandbox.fs.deleteFile(filePath);
          } catch (dirError) {
            console.error(`Failed to delete ${filePath} from Daytona:`, dirError);
            throw dirError;
          }
        }
      }
    } catch (error) {
      console.error(`Error removing ${filePath} from Daytona:`, error);
      throw error;
    }
  }

  /**
   * Searches for text in files
   */
  async textSearch(pattern: string, options?: Partial<TextSearchOptions>, onProgress?: TextSearchOnProgressCallback): Promise<Map<string, TextSearchMatch[]>> {
    await this.ensureInitialized();

    // Use ZenFS for text search (much faster)
    const results = new Map<string, TextSearchMatch[]>();

    try {
      // ZenFS's textSearch takes pattern and options
      const searchResults = fs.textSearch(pattern, options as any);

      if (searchResults instanceof Map) {
        // Copy results to our map
        searchResults.forEach((value, key) => {
          results.set(key, value);
        });
      }

      // onProgress callback expects a map with filepath->matches
      if (onProgress) {
        results.forEach((matches, path) => {
          onProgress(path, matches);
        });
      }
    } catch (error) {
      console.warn('ZenFS text search error:', error);
    }

    // Try to supplement with Daytona search
    try {
      const sandbox = await this.sandboxPromise;
      let searchResults;

      // Daytona has findFiles and searchFiles methods
      if (options?.isRegExp) {
        // Use searchFiles for more complex patterns
        searchResults = await sandbox.fs.searchFiles('~', pattern);
      } else {
        // Use findFiles for simple text search
        searchResults = await sandbox.fs.findFiles('~', pattern);
      }

      // Add Daytona results
      for (const match of searchResults) {
        if (!results.has(match.file)) {
          const textMatches: TextSearchMatch[] = [{
            lineNumber: match.line || 0,
            preview: {
              text: match.text || '',
              matches: [{
                startLineNumber: match.line || 0,
                endLineNumber: match.line || 0,
                startColumn: 0,
                endColumn: pattern.length
              }]
            },
            ranges: [{
              startLineNumber: match.line || 0,
              endLineNumber: match.line || 0,
              startColumn: 0,
              endColumn: pattern.length
            }]
          } as any];

          results.set(match.file, textMatches);

          // Call onProgress if provided
          if (onProgress) {
            onProgress(match.file, textMatches);
          }
        }
      }
    } catch (error) {
      console.warn('Daytona search error:', error);
    }

    return results;
  }

  /**
   * Sets up file watching
   */
  async watchPaths(options: WatchPathsOptions, cb: (events: PathWatcherEvent[]) => void): Promise<void> {
    await this.ensureInitialized();

    try {
      // Set up ZenFS watching
      const unsubscribe = fs.watchPaths(options, (events) => {
        // Sync changes to Daytona
        this.syncEventsToDaytona(events).catch(err => {
          console.warn('Failed to sync events to Daytona:', err);
        });

        // Call the callback
        cb(events);
      });

      // Daytona doesn't have a direct watchPaths equivalent
      // We'll need to implement our own watching mechanism or polling

    } catch (error) {
      console.error('watchPaths error:', error);
      throw error;
    }
  }

  /**
   * Sync file events from ZenFS to Daytona
   */
  private async syncEventsToDaytona(events: PathWatcherEvent[]): Promise<void> {
    const sandbox = await this.sandboxPromise;

    for (const event of events) {
      try {
        if (event.type === 'change' || event.type === 'add_file') {
          // Read from ZenFS and write to Daytona
          try {
            const content = fs.readFileSync(event.path);
            // Convert content to Buffer for Daytona
            let contentBuffer: Buffer;
            if (typeof content === 'string') {
              contentBuffer = Buffer.from(content);
            } else if (content instanceof Uint8Array) {
              contentBuffer = Buffer.from(content);
            } else {
              console.warn(`Unexpected content type for ${event.path}`);
              continue;
            }

            // Ensure parent directory exists
            const parentDir = event.path.substring(0, event.path.lastIndexOf('/'));
            if (parentDir) {
              try {
                await sandbox.fs.createFolder(parentDir, "755");
              } catch (err) {
                // Ignore directory exists error
              }
            }

            await sandbox.fs.uploadFile(contentBuffer, event.path);
          } catch (error) {
            console.warn(`Failed to sync ${event.path} to Daytona:`, error);
          }
        } else if (event.type === 'remove_file') {
          try {
            await sandbox.fs.deleteFile(event.path);
          } catch (fileError) {
            console.warn(`Failed to delete file ${event.path} in Daytona:`, fileError);
          }
        } else if (event.type === 'add_dir') {
          try {
            await sandbox.fs.createFolder(event.path, "755");
          } catch (dirError) {
            console.warn(`Failed to create directory ${event.path} in Daytona:`, dirError);
          }
        } else if (event.type === 'remove_dir') {
          try {
            await sandbox.fs.deleteFile(event.path);
          } catch (dirError) {
            console.warn(`Failed to delete directory ${event.path} in Daytona:`, dirError);
          }
        }
      } catch (error) {
        console.warn(`Failed to sync event ${event.type} for ${event.path} to Daytona:`, error);
      }
    }
  }

  /**
   * Gets the working directory
   */
  async workdir(): Promise<string> {
    await this.ensureInitialized();

    try {
      const sandbox = await this.sandboxPromise;
      // Daytona doesn't have a direct getUserRootDir method in newer versions
      // Using a default path for user's home directory
      return '/home/daytona';
    } catch (error) {
      console.error('Failed to get Daytona root dir:', error);
      return '/';
    }
  }

  /**
   * Writes a file to the specified path
   */
  async writeFile(filePath: string, content: string | Uint8Array, options?: string | { encoding?: string | null } | null): Promise<void> {
    await this.ensureInitialized();

    // Write to ZenFS
    try {
      // Ensure parent directory exists
      const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (parentDir && !fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, options as any);
    } catch (error) {
      console.warn(`ZenFS writeFile error for ${filePath}:`, error);
    }

    // Write to Daytona
    try {
      const sandbox = await this.sandboxPromise;

      // Ensure parent directory exists
      const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (parentDir) {
        try {
          await sandbox.fs.createFolder(parentDir, "755");
        } catch (err) {
          // Ignore directory exists errors
          if (!String(err).includes('already exists')) {
            console.warn(`Failed to create parent directory ${parentDir} in Daytona:`, err);
          }
        }
      }

      // Convert content to Buffer for Daytona's uploadFile
      let contentBuffer: Buffer;
      if (typeof content === 'string') {
        contentBuffer = Buffer.from(content);
      } else if (content instanceof Uint8Array) {
        contentBuffer = Buffer.from(content);
      } else {
        throw new Error(`Unexpected content type for ${filePath}`);
      }

      await sandbox.fs.uploadFile(contentBuffer, filePath);
    } catch (error) {
      console.error(`Failed to write ${filePath} to Daytona:`, error);
      throw error;
    }
  }

  /**
   * Changes the current ZenFS backend
   * @param backend The new backend to use
   * @param options Optional backend-specific options
   */
  async changeBackend(backend: Backend<any, any>, options?: any): Promise<void> {
    this.zenFsBackend = backend;
    this.zenFsInitialized = false;

    try {
      // Re-initialize with the new backend
      await configureSingle({
        backend: this.zenFsBackend,
        options: options || { name: 'aimpact-zenfs' }
      });
      this.zenFsInitialized = true;
      console.log('ZenFS backend changed to:', backend.name);
    } catch (error) {
      console.error('Failed to change ZenFS backend:', error);
      throw error;
    }
  }
}
