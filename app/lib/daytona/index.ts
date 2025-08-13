import { Daytona, Sandbox } from '@daytonaio/sdk';

let sandboxPromise: Promise<Sandbox> | null = null;
let sandboxId: string | null = null;
let daytonaApiUrl = import.meta.env.VITE_DAYTONA_API_URL || 'https://app.daytona.io/api';
let daytonaApiKey = import.meta.env.VITE_DAYTONA_API_KEY || '';
let daytonaOrgId = import.meta.env.VITE_DAYTONA_ORG_ID || '';

export function getSandbox(): Promise<Sandbox> {
  if (!sandboxPromise) {
    const daytona = new Daytona({
      apiKey: import.meta.env.VITE_DAYTONA_API_KEY || '',
    });
    sandboxPromise = daytona.create({
      language: 'typescript',
      autoDeleteInterval: 0,
    });
    sandboxPromise.then((sandbox) => {
      sandboxId = sandbox.id;
      console.log('Sandbox created with ID:', sandboxId);
    }).catch((error) => {
      console.error('Error creating sandbox:', error);
    });
  }
  return sandboxPromise;
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

