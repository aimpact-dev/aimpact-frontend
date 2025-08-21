import type {
  BufferEncoding, DirEnt, TextSearchMatch,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';
import type { PathWatcherEvent } from './types';

export abstract class AimpactFs {

  abstract workdir(): Promise<string>;

  abstract writeFile(
    filePath: string,
    content: string | Uint8Array,
    encoding?: BufferEncoding): Promise<void>;

  abstract readFile(filePath: string, encoding: BufferEncoding): Promise<string>;

  abstract watchPaths(
    options: WatchPathsOptions,
    cb: (events: PathWatcherEvent[]) => void
  ): Promise<void>;

  /*
  * Creates a directory at the specified path.
  * Always creates the directory recursively.
  * Returns the root of the created path, e.g. if you create 'a/b/c', it returns 'a'.
  * It is done to imitate webcontainer behavior.
  */
  abstract mkdir(dirPath: string): Promise<string>;

  abstract rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;

  /*
  * Reads the contents of a directory at the specified path.
  * Returns an array of directory entries, which may include files and subdirectories.
   */
  abstract readdir(
    path: string
  ): Promise<DirEnt<string>[]>;

  abstract textSearch(
    pattern: string,
    options?: Partial<TextSearchOptions>,
    onProgress?: TextSearchOnProgressCallback
  ): Promise<Map<string, TextSearchMatch[]>>

  abstract mkdirLocal(dirPath: string): Promise<string>;

  abstract writeFileLocal(filePath: string, content: string | Uint8Array, encoding?: BufferEncoding): Promise<void>;

  abstract rmLocal(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;
}

