export class PortCatcher{
  private port: number | undefined; // Default port for Vite
  //Collection of functions to be called when we receive a new port
  private portCaughtCallbacks: Array<(port: number) => void> = [];
  private portRemovedCallbacks: Array<(port: number) => void> = [];

  putNewPort(port: number): void {
    if(this.port !== undefined){
      // If there was a previous port, notify its removal
      const oldPort = this.port;
      this.portRemovedCallbacks.forEach(callback => callback(oldPort));
    }
    this.port = port;
    // Notify all registered callbacks about the new port
    this.portCaughtCallbacks.forEach(callback => callback(port));
  }

  removePort(){
    if(this.port !== undefined){
      const oldPort = this.port;
      this.port = undefined;
      // Notify all registered callbacks about the removed port
      this.portRemovedCallbacks.forEach(callback => callback(oldPort));
    }
  }

  getPort(): number | undefined {
    return this.port;
  }

  /**
   * Callbacks registered here will be called every time a port is removed.
   * Calls also happen when a new port is caught, so the previous one is removed.
   * If there was no previous port, callbacks will not be called.
   * @param callback
   */
  addPortRemovedCallback(callback: ((port: number) => void)): void {
    this.portRemovedCallbacks.push(callback);
  }

  /**
   * Callbacks registered here will be called every time a new port is caught.
   * @param callback
   */
  addPortCaughtCallback(callback: (port: number) => void): void {
    this.portCaughtCallbacks.push(callback);
  }
}

// Singleton instance of PortCatcher
let portCatcherInstance: PortCatcher | null = null;

export function getPortCatcher(): PortCatcher {
  if (!portCatcherInstance) {
    portCatcherInstance = new PortCatcher();
    console.log('PortCatcher instance created');
  } else {
    console.log('Using existing PortCatcher instance');
  }
  return portCatcherInstance;
}
