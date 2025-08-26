import type { PortCatcher } from '~/utils/portCatcher';
import { atom } from 'nanostores';
import { RemoteSandbox } from '~/lib/daytona/remoteSandbox';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class AimpactPreviewStore {
  private sandbox: Promise<RemoteSandbox>;
  private portCatcher: PortCatcher;

  previews = atom<PreviewInfo[]>([]);

  constructor(sandbox: Promise<RemoteSandbox>, portCatcher: PortCatcher) {
    this.sandbox = sandbox;
    this.portCatcher = portCatcher;
    this.previews.set([]);

    portCatcher.addCallback((port: number) => {
      this.onPortChange(port);
    });
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
