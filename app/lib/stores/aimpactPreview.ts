import type { Sandbox } from '@daytonaio/sdk';
import type { PortCatcher } from '~/utils/portCatcher';
import { atom } from 'nanostores';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class AimpactPreviewStore {
  private sandbox: Promise<Sandbox>;
  private portCatcher: PortCatcher;

  previews = atom<PreviewInfo[]>([]);

  constructor(sandbox: Promise<Sandbox>, portCatcher: PortCatcher) {
    this.sandbox = sandbox;
    this.portCatcher = portCatcher;

    portCatcher.addCallback(this.onPortChange);
  }

  private async onPortChange(port: number){
    this.previews.set([]);
    const sandbox = await this.sandbox;
    const url = await sandbox.getPreviewLink(port);
    const previewInfo: PreviewInfo = {
      port: port,
      ready: true,
      baseUrl: url.url
    };
    this.previews.set([previewInfo]);
  }
}
