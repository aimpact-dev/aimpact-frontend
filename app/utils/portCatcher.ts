export class PortCatcher{
  private port: number | undefined; // Default port for Vite
  //Collection of functions to be called when we receive a new port
  private portChangeCallbacks: Array<(port: number) => void> = [];


  putNewPort(port: number): void {
    this.port = port;
    // Notify all registered callbacks about the new port
    this.portChangeCallbacks.forEach(callback => callback(port));
    console.log(`New port set: ${this.port}`);
  }

  getPort(): number | undefined {
    console.log(`Current port: ${this.port}`);
    return this.port;
  }

  addCallback(callback: (port: number) => void): void {
    this.portChangeCallbacks.push(callback);
    console.log(`Callback added. Total callbacks: ${this.portChangeCallbacks.length}`);
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
