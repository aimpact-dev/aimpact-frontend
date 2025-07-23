/**
 * Creates a function that samples calls at regular intervals and captures trailing calls.
 * - Drops calls that occur between sampling intervals
 * - Takes one call per sampling interval if available
 * - Captures the last call if no call was made during the interval
 *
 * @param fn The function to sample
 * @param sampleInterval How often to sample calls (in ms)
 * @returns The sampled function with cancel capability
 */
export function createSampler<T extends (...args: any[]) => any>(fn: T, sampleInterval: number): T & { cancel: () => void } {
  let lastArgs: Parameters<T> | null = null;
  let lastTime = 0;
  let timeout: NodeJS.Timeout | null = null;
  let isDestroyed = false;

  // Clear any pending timeout
  const clearPendingTimeout = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  // Execute the function with error handling
  const executeFunction = (context: any, args: Parameters<T>) => {
    if (isDestroyed) return;
    
    try {
      return fn.apply(context, args);
    } catch (error) {
      console.error('Error in sampled function:', error);
      throw error;
    }
  };

  // Create a function with the same type as the input function
  const sampled = function (this: any, ...args: Parameters<T>) {
    if (isDestroyed) return;

    const now = Date.now();
    lastArgs = args;

    // If we're within the sample interval, set up trailing call
    if (now - lastTime < sampleInterval) {
      // Set up trailing call if not already set
      if (!timeout) {
        const remainingTime = Math.max(0, sampleInterval - (now - lastTime));
        
        timeout = setTimeout(() => {
          timeout = null;
          lastTime = Date.now();

          if (lastArgs && !isDestroyed) {
            const argsToExecute = lastArgs;
            lastArgs = null;
            executeFunction(this, argsToExecute);
          }
        }, remainingTime);
      }

      return;
    }

    // If we're outside the interval, execute immediately
    clearPendingTimeout(); // Clear any pending timeout
    lastTime = now;
    const argsToExecute = args;
    lastArgs = null;
    
    return executeFunction(this, argsToExecute);
  } as T & { cancel: () => void };

  // Add cancel method
  sampled.cancel = () => {
    isDestroyed = true;
    clearPendingTimeout();
    lastArgs = null;
    lastTime = 0;
  };

  return sampled;
}