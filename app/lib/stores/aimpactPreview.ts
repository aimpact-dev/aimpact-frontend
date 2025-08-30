import type { PreviewPortCatcher } from '~/utils/previewPortCatcher';
import { atom } from 'nanostores';
import { AimpactSandbox } from '~/lib/daytona/aimpactSandbox';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class AimpactPreviewStore {
  private sandbox: Promise<AimpactSandbox>;
  private portCatcher: PreviewPortCatcher;

  previews = atom<PreviewInfo[]>([]);

  constructor(sandbox: Promise<AimpactSandbox>, portCatcher: PreviewPortCatcher) {
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
      baseUrl: "https://5173-a63c8af4-a237-4b0d-84b8-bb330b0b70c0.proxy.dayona.works/fafafaf"
    };
    this.previews.set([previewInfo]);
  }
}
