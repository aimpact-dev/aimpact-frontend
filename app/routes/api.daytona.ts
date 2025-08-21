import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { LazySandbox } from '~/lib/daytona/lazySandbox';
import { Buffer } from 'buffer';
import type { SessionExecuteRequest } from '@daytonaio/api-client';

const allowedMethods = [
  'getPreviewLink',
  'createFolder',
  'deleteFile',
  'executeCommand',
  'uploadFile',
  'searchFiles',
  'downloadFile',
  'listFiles',
  'createSession',
  'deleteSession',
  'executeSessionCommand',
  'getSessionCommand',
  'getSessionCommandLogs',
  'dispose'
];

const authTokenToSandboxMap = new Map<string, LazySandbox>();

function getEnvVar(context: any, key: string): string | undefined {
  if (context.cloudflare?.env?.[key]) {
    return context.cloudflare.env[key];
  }
  return process.env[key];
}

function getSandbox(context: any, authToken: string): LazySandbox {
  if (!authTokenToSandboxMap.has(authToken)) {
    const apiKey = getEnvVar(context, 'DAYTONA_API_KEY');
    const apiUrl = getEnvVar(context, 'DAYTONA_API_URL');
    const orgId = getEnvVar(context, 'DAYTONA_ORG_ID');
    if (!apiKey || !apiUrl || !orgId) {
      throw new Error('Missing Daytona API configuration');
    }
    const sandbox = new LazySandbox(apiUrl, apiKey, orgId);
    authTokenToSandboxMap.set(authToken, sandbox);
  }
  return authTokenToSandboxMap.get(authToken)!;
}


/**
 * Action for proxying Daytona API requests on the server side.
 * Request must contain a method name and arguments in JSON format.
 * @param context
 * @param request
 */
export async function action({context, request}: ActionFunctionArgs) {
  let payload: {method: string, args: any, authToken: string};
  try{
    payload = await request.json<{
      method: string,
      args: any,
      authToken: string
    }>();
  }
  catch (error){
    return new Response('Invalid request format', { status: 400 });
  }
  const { method, args, authToken } = payload;

  if (!allowedMethods.includes(method)) {
    throw new Response('Method not allowed', { status: 405 });
  }
  if (!authToken) {
    throw new Response('Unauthorized', { status: 401 });
  }

  switch (method){
    case 'getPreviewLink':
      return handleGetPreviewLink(context, args, authToken);
    case 'createFolder':
      return handleCreateFolder(context, args, authToken);
    case 'deleteFile':
      return deleteFile(context, args, authToken);
    case 'executeCommand':
      return executeCommand(context, args, authToken);
    case 'uploadFile':
      return uploadFile(context, args, authToken);
    case 'searchFiles':
      return searchFiles(context, args, authToken);
    case 'downloadFile':
      return downloadFile(context, args, authToken);
    case 'listFiles':
      return listFiles(context, args, authToken);
    case 'createSession':
      return createSession(context, args, authToken);
    case 'deleteSession':
      return deleteSession(context, args, authToken);
    case 'executeSessionCommand':
      return executeSessionCommand(context, args, authToken);
    case 'getSessionCommand':
      return getSessionCommand(context, args, authToken);
    case 'getSessionCommandLogs':
      return getSessionCommandLogs(context, args, authToken);
    case 'dispose':
      return dispose(context, args, authToken);
    default:
      return new Response('Method not implemented', { status: 501 });
  }
}

async function handleGetPreviewLink(context: any, args: any, authToken: string){
  const port = args?.port;
  if(!port || typeof port !== 'number' || port <= 0 || port > 65535) {
    return new Response('Invalid port number for getPreviewLink method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try{
    const link = await sandbox.getPreviewLink(port);
    const result = {
      url: link.url,
      token: link.token
    };
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  catch (error) {
    console.error('Error in getPreviewLink:', error);
    return new Response('Failed to get preview link', { status: 500 });
  }
}

async function handleCreateFolder(context: any, args: any, authToken: string){
  const path = args?.path;
  const mode = args?.mode;

  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for createFolder method.', { status: 400 });
  }
  if (!mode || typeof mode !== 'string') {
    return new Response('Invalid mode for createFolder method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    await sandbox.createFolder(path, mode);
    return new Response('Folder created successfully', { status: 200 });
  } catch (error) {
    console.error('Error in createFolder:', error);
    return new Response('Failed to create folder', { status: 500 });
  }
}

async function deleteFile(context: any, args: any, authToken: string){
const path = args?.path;

  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for deleteFile method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    await sandbox.deleteFile(path);
    return new Response('File deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return new Response('Failed to delete file', { status: 500 });
  }
}

async function executeCommand(context: any, args: any, authToken: string){
  const command = args?.command;
  const cwd = args?.cwd;
  const env = args?.env;
  const timeout = args?.timeout;

  if (!command || typeof command !== 'string') {
    return new Response('Invalid command for executeCommand method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    const response = await sandbox.executeCommand(command, cwd, env, timeout);
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in executeCommand:', error);
    return new Response('Failed to execute command', { status: 500 });
  }
}

async function uploadFile(context: any, args: any, authToken: string){
  const fileStr = args?.file;
  const remotePath = args?.remotePath;
  const timeout = args?.timeout;

  console.log("uploadFile called with args:", args);
  if (!fileStr) {
    return new Response('Invalid file for uploadFile method.', { status: 400 });
  }
  const fileStrDecoded = Buffer.from(fileStr, 'base64').toString();

  if (!remotePath || typeof remotePath !== 'string') {
    return new Response('Invalid remote path for uploadFile method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    console.log("Uploading file to remote path:", remotePath);
    await sandbox.uploadFile(Buffer.from(fileStrDecoded), remotePath, timeout);
    return new Response('File uploaded successfully', { status: 200 });
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return new Response('Failed to upload file', { status: 500 });
  }
}

async function searchFiles(context: any, args: any, authToken: string){
  const path = args?.path;
  const pattern = args?.pattern;

  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for searchFiles method.', { status: 400 });
  }
  if (!pattern || typeof pattern !== 'string') {
    return new Response('Invalid pattern for searchFiles method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    const response = await sandbox.searchFiles(path, pattern);
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in searchFiles:', error);
    return new Response('Failed to search files', { status: 500 });
  }
}

async function downloadFile(context: any, args: any, authToken: string){
  const remotePath = args?.remotePath;
  const timeout = args?.timeout;

  if (!remotePath || typeof remotePath !== 'string') {
    return new Response('Invalid remote path for downloadFile method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    const fileBuffer = await sandbox.downloadFile(remotePath, timeout);
    const fileStr = fileBuffer.toString('base64');
    const body = JSON.stringify({
      fileContent: fileStr,
    });
    return new Response(body, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  } catch (error) {
    console.error('Error in downloadFile:', error);
    return new Response('Failed to download file', { status: 500 });
  }
}

async function listFiles(context: any, args: any, authToken: string){
  const path = args?.path;
  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for listFiles method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    const files = await sandbox.listFiles(path);
    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in listFiles:', error);
    return new Response('Failed to list files', { status: 500 });
  }
}

async function createSession(context: any, args: any, authToken: string){
const sessionId = args?.sessionId;
  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for createSession method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    await sandbox.createSession(sessionId);
    return new Response('Session created successfully', { status: 200 });
  } catch (error) {
    console.error('Error in createSession:', error);
    return new Response('Failed to create session', { status: 500 });
  }
}

async function deleteSession(context: any, args: any, authToken: string){
const sessionId = args?.sessionId;
  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for deleteSession method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    await sandbox.deleteSession(sessionId);
    return new Response('Session deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error in deleteSession:', error);
    return new Response('Failed to delete session', { status: 500 });
  }
}

async function executeSessionCommand(context: any, args: any, authToken: string){
  const sessionId = args?.sessionId;
  const requestObj = args?.request;
  const timeout = args?.timeout;

  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for executeSessionCommand method.', { status: 400 });
  }
  if (!requestObj || typeof requestObj !== 'object') {
    return new Response('Invalid command for executeSessionCommand method.', { status: 400 });
  }

  let request: SessionExecuteRequest;
  try {
    request = JSON.parse(requestObj);
  } catch (error) {
    return new Response('Invalid command format', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    const response = await sandbox.executeSessionCommand(sessionId, request, timeout);
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in executeSessionCommand:', error);
    return new Response('Failed to execute session command', { status: 500 });
  }
}

async function getSessionCommand(context: any, args: any, authToken: string){
const sessionId = args?.sessionId;
  const commandId = args?.commandId;

  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for getSessionCommand method.', { status: 400 });
  }
  if (!commandId || typeof commandId !== 'string') {
    return new Response('Invalid command ID for getSessionCommand method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    const command = await sandbox.getSessionCommand(sessionId, commandId);
    return new Response(JSON.stringify(command), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in getSessionCommand:', error);
    return new Response('Failed to get session command', { status: 500 });
  }
}

async function getSessionCommandLogs(context: any, args: any, authToken: string){
const sessionId = args?.sessionId;
  const commandId = args?.commandId;

  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for getSessionCommandLogs method.', { status: 400 });
  }
  if (!commandId || typeof commandId !== 'string') {
    return new Response('Invalid command ID for getSessionCommandLogs method.', { status: 400 });
  }

  const sandbox = getSandbox(context, authToken);
  try {
    const logs = await sandbox.getSessionCommandLogs(sessionId, commandId);
    return new Response(logs, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Error in getSessionCommandLogs:', error);
    return new Response('Failed to get session command logs', { status: 500 });
  }
}

async function dispose(context: any, args: any, authToken: string){
  const sandbox = getSandbox(context, authToken);
  try {
    await sandbox.dispose();
    return new Response('Sandbox disposed successfully', { status: 200 });
  } catch (error) {
    console.error('Error in dispose:', error);
    return new Response('Failed to dispose sandbox', { status: 500 });
  }
}
