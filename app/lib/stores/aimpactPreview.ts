import type { PortCatcher } from '~/utils/portCatcher';
import { atom } from 'nanostores';
import { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class AimpactPreviewStore {
  private sandbox: Promise<AimpactSandbox>;
  private portCatcher: PortCatcher;

  previews = atom<PreviewInfo[]>([]);

  constructor(sandbox: Promise<AimpactSandbox>, portCatcher: PortCatcher) {
    this.sandbox = sandbox;
    this.portCatcher = portCatcher;
    this.previews.set([]);

    portCatcher.addPortCaughtCallback((port: number) => {
      this.onPortChange(port);
    });
    portCatcher.addPortRemovedCallback((port: number) => {
      this.onPortRemoved(port);
    });
  }

  private onPortRemoved(port: number){
    this.previews.set([]);
  }

  private async onPortChange(port: number){
    this.previews.set([]);
    const sandbox = await this.sandbox;
    const url = await sandbox.getPreviewLink(port);
    console.log("Preview URL:", url.url);
    const previewInfo: PreviewInfo = {
      port: port,
      ready: true,
      baseUrl: url.url
    };
    this.previews.set([previewInfo]);
  }
}
