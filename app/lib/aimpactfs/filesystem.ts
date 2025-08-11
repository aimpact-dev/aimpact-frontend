import type {
  PathWatcherEvent,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';

export abstract class AimpactFs {

  abstract get workdir(): string;

  abstract writeFile(
    filePath: string,
    content: string | Uint8Array,
    options: string | { encoding?: string | null } | null
  ): Promise<void>;

  abstract readFile(filePath: string, encoding: null): Promise<Uint8Array>;

  abstract watchPaths(
    options: WatchPathsOptions,
    cb: (events: PathWatcherEvent[]) => void
  ): void;

  abstract mkdir(dirPath: string, options: { recursive: true }): Promise<string>;

  abstract rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;

  abstract readdir(
    dirPath: string,
    options?: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null
  ): Promise<string[]>;

  abstract textSearch(
    pattern: string,
    options?: Partial<TextSearchOptions>,
    onProgress?: TextSearchOnProgressCallback
  ): Promise<Map<string, { line: number; match: string }[]>>;
}

