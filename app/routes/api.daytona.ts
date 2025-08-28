import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { LazySandbox } from '~/lib/daytona/lazySandbox';
import { Buffer } from 'buffer';

/**
 * Parameters required for identifying a user's sandbox.
 */
interface Identification {
  context: any;
  authToken: string;
  uuid: string;
}

interface MethodParams {
  args: any;
  identification: Identification;
}

const allowedMethods = [
  'createSandbox',
  'getPreviewLink',
  'createFolder',
  'fileExists',
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
  'dispose',
];

const usersSandboxes = new Map<string, LazySandbox>();

function getEnvVar(context: any, key: string): string | undefined {
  if (context.cloudflare?.env?.[key]) {
    return context.cloudflare.env[key];
  }
  return process.env[key];
}

function getCompositeId(identification: Identification){
  return `${identification.authToken}:${identification.uuid}`;
}

function getSandbox(identification: Identification): LazySandbox {
  const compositeId = getCompositeId(identification);
  if (!usersSandboxes.has(compositeId)) {
    throw new Response('Sandbox not found for the provided auth token and uuid', { status: 404 });
  }
  return usersSandboxes.get(compositeId)!;
}

function createSandboxIfNotExists(identification: Identification): LazySandbox{
  const compositeId = getCompositeId(identification);
  const {context} = identification;
  if(!usersSandboxes.has(compositeId)) {
    const apiKey = getEnvVar(context, 'DAYTONA_API_KEY');
    const apiUrl = getEnvVar(context, 'DAYTONA_API_URL');
    const orgId = getEnvVar(context, 'DAYTONA_ORG_ID');
    if (!apiKey || !apiUrl || !orgId) {
      throw new Error('Missing Daytona API configuration');
    }
    const sandbox = new LazySandbox(apiUrl, apiKey, orgId);
    usersSandboxes.set(compositeId, sandbox);
  }
  return usersSandboxes.get(compositeId)!;
}


/**
 * Action for proxying Daytona API requests on the server side.
 * Request must contain a method name and arguments in JSON format.
 * @param context
 * @param request
 */
export async function action({context, request}: ActionFunctionArgs) {
  let payload: {method: string, args: any, authToken: string, uuid: string};
  try{
    payload = await request.json<{
      method: string,
      args: any,
      authToken: string,
      uuid: string
    }>();
  }
  catch (error){
    return new Response('Invalid request format', { status: 400 });
  }
  const { method, args, authToken, uuid } = payload;
  const params: MethodParams = {
    args,
    identification: {
      context,
      authToken,
      uuid
    }
  }

  if (!allowedMethods.includes(method)) {
    throw new Response('Method not allowed', { status: 405 });
  }
  if (!authToken) {
    throw new Response('Unauthorized', { status: 401 });
  }

  switch (method){
    case 'createSandbox':
      return createSandbox(params);
    case 'getPreviewLink':
      return getPreviewLink(params);
    case 'createFolder':
      return createFolder(params);
    case 'fileExists':
      return fileExists(params);
    case 'deleteFile':
      return deleteFile(params);
    case 'executeCommand':
      return executeCommand(params);
    case 'uploadFile':
      return uploadFile(params);
    case 'searchFiles':
      return searchFiles(params);
    case 'downloadFile':
      return downloadFile(params);
    case 'listFiles':
      return listFiles(params);
    case 'createSession':
      return createSession(params);
    case 'deleteSession':
      return deleteSession(params);
    case 'executeSessionCommand':
      return executeSessionCommand(params);
    case 'getSessionCommand':
      return getSessionCommand(params);
    case 'getSessionCommandLogs':
      return getSessionCommandLogs(params);
    case 'dispose':
      return disposeSandbox(params);
    default:
      return new Response('Method not implemented', { status: 501 });
  }
}

async function createSandbox(params: MethodParams) {
  const { identification } = params;
  try{
    createSandboxIfNotExists(identification);
  }
  catch (error) {
    return new Response('Failed to create sandbox: ' + error, { status: 500 });
  }
  return new Response('Sandbox created successfully', { status: 200 });
}

async function getPreviewLink(params: MethodParams){
  const { args, identification } = params;
  const port = args?.port;
  if(!port || typeof port !== 'number' || port <= 0 || port > 65535) {
    return new Response('Invalid port number for getPreviewLink method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
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
    return new Response('Failed to get preview link', { status: 500 });
  }
}

async function createFolder(params: MethodParams){
  const { args, identification } = params;
  const path = args?.path;
  const mode = args?.mode;

  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for createFolder method.', { status: 400 });
  }
  if (!mode || typeof mode !== 'string') {
    return new Response('Invalid mode for createFolder method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    await sandbox.createFolder(path, mode);
    return new Response('Folder created successfully', { status: 200 });
  } catch (error) {
    return new Response('Failed to create folder', { status: 500 });
  }
}

async function fileExists(params: MethodParams){
  const { args, identification } = params;
  const filePath = args?.filePath;
  if (!filePath || typeof filePath !== 'string') {
    return new Response('Invalid file path for fileExists method.', { status: 400 });
  }
  const sandbox = getSandbox(identification);
  try {
    const exists = await sandbox.fileExists(filePath);
    return new Response(JSON.stringify({ exists }),{
      status: 200, headers: { 'Content-Type': 'application/json' }});
  }
  catch (error) {
    console.log("Error in fileExists:", error);
    return new Response('Failed to check if file exists', { status: 500 });
  }
}

async function deleteFile(params: MethodParams){
  const { args, identification } = params;
  const path = args?.path;

  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for deleteFile method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    await sandbox.deleteFile(path);
    return new Response('File deleted successfully', { status: 200 });
  } catch (error) {
    return new Response('Failed to delete file', { status: 500 });
  }
}

async function executeCommand(params: MethodParams){
  const { args, identification } = params;
  const command = args?.command;
  const cwd = args?.cwd;
  const env = args?.env;
  const timeout = args?.timeout;

  if (!command || typeof command !== 'string') {
    return new Response('Invalid command for executeCommand method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
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

async function uploadFile(params: MethodParams){
  const { args, identification } = params;
  const fileStr = args?.file;
  const remotePath = args?.remotePath;

  if (!fileStr) {
    return new Response('Invalid file for uploadFile method.', { status: 400 });
  }
  const fileStrDecoded = Buffer.from(fileStr, 'base64').toString();

  if (!remotePath || typeof remotePath !== 'string') {
    return new Response('Invalid remote path for uploadFile method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    await sandbox.uploadFile(Buffer.from(fileStrDecoded), remotePath);
    return new Response('File uploaded successfully', { status: 200 });
  } catch (error) {
    return new Response('Failed to upload file. Error: ' + error, { status: 500 });
  }
}

async function searchFiles(params: MethodParams){
  const { args, identification } = params;
  const path = args?.path;
  const pattern = args?.pattern;

  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for searchFiles method.', { status: 400 });
  }
  if (!pattern || typeof pattern !== 'string') {
    return new Response('Invalid pattern for searchFiles method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
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

async function downloadFile(params: MethodParams){
  const { args, identification } = params;
  const remotePath = args?.remotePath;
  const timeout = args?.timeout;

  if (!remotePath || typeof remotePath !== 'string') {
    return new Response('Invalid remote path for downloadFile method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);

  try {
    const fileBuffer = await sandbox.downloadFile(remotePath, timeout);
    const fileStr = fileBuffer.toString('base64');
    const body = JSON.stringify({
      fileContent: fileStr,
    });
    return new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in downloadFile:', error);
    return new Response('Failed to download file', { status: 500 });
  }
}

async function listFiles(params: MethodParams){
  const { args, identification } = params;
  const path = args?.path;
  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for listFiles method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    const files = await sandbox.listFiles(path);
    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Failed to list files', { status: 500 });
  }
}

async function createSession(params: MethodParams){
  const { args, identification } = params;
  const sessionId = args?.sessionId;
  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for createSession method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    await sandbox.createSession(sessionId);
    return new Response('Session created successfully', { status: 200 });
  } catch (error) {
    return new Response('Failed to create session', { status: 500 });
  }
}

async function deleteSession(params: MethodParams){
  const { args, identification } = params;
  const sessionId = args?.sessionId;
  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for deleteSession method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    await sandbox.deleteSession(sessionId);
    return new Response('Session deleted successfully', { status: 200 });
  } catch (error) {
    return new Response('Failed to delete session', { status: 500 });
  }
}

async function executeSessionCommand(params: MethodParams){
  const { args, identification } = params;
  const sessionId = args?.sessionId;
  const requestObj = args?.request;
  const timeout = args?.timeout;

  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for executeSessionCommand method.', { status: 400 });
  }
  if (!requestObj || typeof requestObj !== 'object') {
    return new Response('Invalid command for executeSessionCommand method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    const response = await sandbox.executeSessionCommand(sessionId, requestObj, timeout);
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Failed to execute session command', { status: 500 });
  }
}

async function getSessionCommand(params: MethodParams){
  const { args, identification } = params;
  const sessionId = args?.sessionId;
  const commandId = args?.commandId;

  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for getSessionCommand method.', { status: 400 });
  }
  if (!commandId || typeof commandId !== 'string') {
    return new Response('Invalid command ID for getSessionCommand method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    const command = await sandbox.getSessionCommand(sessionId, commandId);
    return new Response(JSON.stringify(command), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Failed to get session command', { status: 500 });
  }
}

async function getSessionCommandLogs(params: MethodParams){
  const { args, identification } = params;
  const sessionId = args?.sessionId;
  const commandId = args?.commandId;

  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('Invalid session ID for getSessionCommandLogs method.', { status: 400 });
  }
  if (!commandId || typeof commandId !== 'string') {
    return new Response('Invalid command ID for getSessionCommandLogs method.', { status: 400 });
  }

  const sandbox = getSandbox(identification);
  try {
    const logs = await sandbox.getSessionCommandLogs(sessionId, commandId);
    return new Response(logs, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new Response('Failed to get session command logs', { status: 500 });
  }
}

async function disposeSandbox(params: MethodParams){
  const { identification } = params;
  const compositeId = getCompositeId(identification);
  if(usersSandboxes.has(compositeId)){
    const sandbox = usersSandboxes.get(compositeId);
    if(!sandbox){
      return new Response('Sandbox instance not found', { status: 404 });
    }
    usersSandboxes.delete(compositeId);
    try {
      await sandbox.dispose();
      return new Response('Sandbox disposed successfully', { status: 200 });
    } catch (error) {
      return new Response('Failed to dispose sandbox', { status: 500 });
    }
  }
  return new Response('Sandbox not found for the provided auth token', { status: 404 });
}
