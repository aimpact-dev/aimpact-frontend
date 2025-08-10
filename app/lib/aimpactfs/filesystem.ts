import type { Sandbox } from '@daytonaio/sdk';
import type {
  PathWatcherEvent,
  TextSearchOnProgressCallback,
  TextSearchOptions,
  WatchPathsOptions
} from '@webcontainer/api';

export class AimpactFs {
  private readonly sandbox: Sandbox;
  private readonly rootDir: string;

  constructor(rootDir: string, sandbox: Sandbox);

  get workdir(): string;

  writeFile(
    filePath: string,
    content: string | Uint8Array,
    options: string | { encoding?: string | null } | null
  ): Promise<void>;

  readFile(filePath: string, encoding: null): Promise<Uint8Array>;

  watchPaths(
    options: WatchPathsOptions,
    cb: (events: PathWatcherEvent[]) => void
  ): void;

  mkdir(dirPath: string, options: { recursive: true }): Promise<string>;

  rm(filePath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;

  readdir(
    dirPath: string,
    options?: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null
  ): Promise<string[]>;

  textSearch(
    pattern: string,
    options?: Partial<TextSearchOptions>,
    onProgress?: TextSearchOnProgressCallback
  ): Promise<Map<string, { line: number; match: string }[]>>;
}

