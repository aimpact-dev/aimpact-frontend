import type { WatchPathsOptions } from '@webcontainer/api';
import type { PathWatcherEvent } from '~/lib/aimpactfs/types';
import { minimatch } from 'minimatch';

//Class that stores callbacks and provides methods to add and retrieve them.
export class WatchPathsCallbacks {
  private watchCallbacks: Map<WatchPathsOptions, (events: PathWatcherEvent[]) => void> = new Map();

  addCallback(options: WatchPathsOptions, cb: (events: PathWatcherEvent[]) => void)  {
    this.watchCallbacks.set(options, cb);
  }

  getCallbacksForPath(path: string): ((events: PathWatcherEvent[]) => void)[] {
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
}
