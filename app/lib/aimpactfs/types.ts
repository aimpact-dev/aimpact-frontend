export interface PathWatcherEvent {
  type: 'change' | 'add_file' | 'pre_add_file' | 'remove_file' | 'add_dir' | 'pre_add_dir' | 'remove_dir' | 'update_directory';
  path: string;
  buffer?: Uint8Array;
}
