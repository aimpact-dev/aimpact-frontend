import type {
  BufferEncoding, DirEnt,
  PathWatcherEvent, TextSearchMatch,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';

export abstract class AimpactFs {

  abstract workdir(): Promise<string>;

  abstract writeFile(
    filePath: string,
    content: string | Uint8Array,
    options?: string | { encoding?: string | null } | null
  ): Promise<void>;

  abstract readFile(filePath: string, encoding: BufferEncoding): Promise<string>;

  abstract watchPaths(
    options: WatchPathsOptions,
    cb: (events: PathWatcherEvent[]) => void
  ): Promise<void>;

  abstract mkdir(dirPath: string, options: { recursive: true }): Promise<string>;

  abstract rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;

  abstract readdir(
    path: string,
    options: {encoding?: BufferEncoding | null, withFileTypes: true},
  ): Promise<DirEnt<string>[]>;

  abstract readdir(
    path: string,
    options: {encoding?: BufferEncoding | null, withFileTypes: true},
  ): Promise<DirEnt<string>[]>;

  abstract textSearch(
    pattern: string,
    options?: Partial<TextSearchOptions>,
    onProgress?: TextSearchOnProgressCallback
  ): Promise<Map<string, TextSearchMatch[]>>
}

