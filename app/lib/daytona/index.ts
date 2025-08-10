import { Daytona, Sandbox } from '@daytonaio/sdk';

let sandboxPromise: Promise<Sandbox> | null = null;

export function getSandbox(): Promise<Sandbox> {
  if (!sandboxPromise) {
    const daytona = new Daytona({
      apiKey: import.meta.env.VITE_DAYTONA_API_KEY || '',
    });
    sandboxPromise = daytona.create({ language: 'typescript' });
  }
  return sandboxPromise;
}
