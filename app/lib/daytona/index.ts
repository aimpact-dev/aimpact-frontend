import { Daytona, Sandbox, Image } from '@daytonaio/sdk';

let sandboxPromise: Promise<Sandbox> | null = null;
let sandboxId: string | null = null;
let daytonaApiUrl = import.meta.env.VITE_DAYTONA_API_URL || 'https://app.daytona.io/api';
let daytonaApiKey = import.meta.env.VITE_DAYTONA_API_KEY || '';
let daytonaOrgId = import.meta.env.VITE_DAYTONA_ORG_ID || '';

export function getSandbox(): Promise<Sandbox> {
  if (!sandboxPromise) {
    sandboxPromise = initializeSandbox().catch((error) => {
      console.error('Error initializing sandbox:', error);
      sandboxPromise = null; // Reset the promise on failure
      throw error; // Re-throw the error to handle it in the calling code
    });
  }
  return sandboxPromise;
}

async function initializeSandbox() : Promise<Sandbox> {
  const daytona = new Daytona({
    apiKey: import.meta.env.VITE_DAYTONA_API_KEY || '',
  });
  const resources = {
    cpu: 1,
    memory: 4,
    disk: 3
  };
  const image = Image.base('node:20-alpine').workdir('/home/daytona');
  const sandbox = await daytona.create({
    language: 'typescript',
    image: image,
    resources: resources,
    autoDeleteInterval: 0,
    public: true,
  });
  sandboxId = sandbox.id;
  console.log('Sandbox created with ID:', sandboxId);
  const corepackInstallResponse = await sandbox.process.executeCommand("npm install --global corepack@latest");
  if (corepackInstallResponse.exitCode !== 0) {
    console.error('Failed to install corepack:', corepackInstallResponse.result);
    throw new Error('Corepack installation failed');
  }
  console.log('Corepack installed successfully');
  const pnpmInstallResponse = await sandbox.process.executeCommand("corepack enable pnpm && corepack use pnpm@latest-10");
  if (pnpmInstallResponse.exitCode !== 0) {
    console.error('Failed to enable pnpm:', pnpmInstallResponse.result);
    throw new Error('PNPM enable failed');
  }
  return sandbox;
}

export function cleanup() {
  fetch(`${daytonaApiUrl}/sandbox/${sandboxId}/stop`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${daytonaApiKey}`,
      'X-Daytona-Organization-ID': daytonaOrgId,
      'Content-Type': 'application/json'
    },
    keepalive: true  // This ensures the request completes even during page unload
  });
}

