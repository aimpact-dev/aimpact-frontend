import type { Sandbox } from '@daytonaio/sdk';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class AimpactPreviewStore {
  private sandbox: Promise<Sandbox>;
}
