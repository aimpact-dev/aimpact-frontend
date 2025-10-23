import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { LazySandbox } from '~/lib/daytona/lazySandbox';
import { Buffer } from 'buffer';
import type { PersistentKV } from '~/lib/persistence/kv/persistentKV';
import { RedisKV } from '~/lib/persistence/kv/redisKV';
import jwt from 'jsonwebtoken';
import { CloudflareKV } from '~/lib/persistence/kv/cloudflareKV';
import { UpstashRedisKV } from '~/lib/persistence/kv/upstashRedisKV';

/**
 * Parameters required for identifying a user's sandbox.
 */
interface Identification {
  context: any;
  userId: string;
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

let persistentKv: PersistentKV | null = null;
const usersSandboxPromises = new Map<string, Promise<LazySandbox>>();

function getEnvVar(context: any, key: string): string {
  let env: string | undefined;
  if (context.cloudflare?.env?.[key]) {
    console.log(`Retrieving EnvVar with key ${key} from cloudflare.`);
    env = context.cloudflare.env[key];
  }
  else {
    console.log(`Retrieving EnvVar with key ${key} from process.`);
    env = process.env[key];
  }
  if(!env){
    console.log(`Not found EnvVar with key ${key}.`);
    throw new Error(`Environment variable "${key}" not found.`);
  }
  return env;
}

function getUserIdFromToken(authToken: string): string | null {
  try {
    const decoded = jwt.decode(authToken) as { sub?: string } | null;
    return decoded?.sub || null;
  } catch {
    return null;
  }
}

function getCompositeId(identification: Identification){
  return `${identification.userId}:${identification.uuid}`;
}

async function getSandbox(identification: Identification): Promise<LazySandbox> {
  const compositeId = getCompositeId(identification);
  console.log(`Trying to retrieve a sandbox for user with id ${compositeId}`);
  if (!usersSandboxPromises.has(compositeId)) {
    console.log(`Sandbox promise not found for user with id ${compositeId}, checking kv storage.`);
    const kv = getPersistentKv(identification.context);
    console.log('Kv storage client received.');
    const existsInKv = await kv.exists(compositeId);
    console.log(`Sandbox id exists for user with id ${compositeId} in kv storage: ${existsInKv}`);
    if (existsInKv) {
      console.log(`Sandbox id for user with id ${compositeId} found in kv storage, retrieving.`);
      const sandboxId = await kv.get(compositeId);
      console.log(`User with id ${compositeId} has sandbox id in kv storage: ${sandboxId}`);
      const context = identification.context;
      const apiKey = getEnvVar(context, 'DAYTONA_API_KEY');
      const apiUrl = getEnvVar(context, 'DAYTONA_API_URL');
      const orgId = getEnvVar(context, 'DAYTONA_ORG_ID');
      const proxyUrl = getEnvVar(context, 'DAYTONA_PROXY_URL');
      const sandbox = new LazySandbox(apiUrl, apiKey, orgId, proxyUrl, sandboxId);
      usersSandboxPromises.set(compositeId, Promise.resolve(sandbox));
      console.log(`New sandbox promise added for user with id ${compositeId}.`);
    }
    else{
      throw new Response('Sandbox not found for the provided auth token and uuid', { status: 404 });
    }
  }
  console.log(`Sandbox promise found for user with id ${compositeId}`);
  return usersSandboxPromises.get(compositeId)!;
}

function getPersistentKv(context: any): PersistentKV {
  if(!persistentKv){
    const upstashRedisUrl = getEnvVar(context, 'UPSTASH_REDIS_REST_URL');
    const upstashRedisToken = getEnvVar(context, 'UPSTASH_REDIS_REST_TOKEN');
    persistentKv = new UpstashRedisKV(upstashRedisUrl, upstashRedisToken);
  }
  return persistentKv;
}

async function createSandboxPromiseIfNotExists(identification: Identification) {
  const compositeId = getCompositeId(identification);
  const {context} = identification;

  const createFunc = async (): Promise<LazySandbox> => {
    console.log(`Creating new LazySandbox instance for user with id ${compositeId}`)
    const kv = getPersistentKv(context);
    console.log(`Key-value storage client created.`);
    const existsInKv = await kv.exists(compositeId);
    console.log(`Sandbox id for user with id ${compositeId} exists in kv: ${existsInKv}.`);
    let sandboxId: string | null = null;
    if(existsInKv){
      console.log(`Retrieving sandbox id from kv for user with id ${compositeId}`)
      sandboxId = await kv.get(compositeId);
      console.log(`User with id ${compositeId} has sandbox id ${sandboxId} stored in kv.`);
    }
    const apiKey = getEnvVar(context, 'DAYTONA_API_KEY');
    const apiUrl = getEnvVar(context, 'DAYTONA_API_URL');
    const orgId = getEnvVar(context, 'DAYTONA_ORG_ID');
    const proxyUrl = getEnvVar(context, 'DAYTONA_PROXY_URL');
    const sandbox = new LazySandbox(apiUrl, apiKey, orgId, proxyUrl, sandboxId);
    console.log(`Initializing sandbox for user with id ${compositeId}`);
    sandboxId = await sandbox.initialize();
    console.log(`Sandbox for user with id ${compositeId} initialized successfully. Sandbox id: ${sandboxId}`);
    //Setting actual sandbox id to kv. This way we handle both cases: when sandbox already exists and when new one is created.
    await kv.set(compositeId, sandboxId);
    console.log(`Sandbox id ${sandboxId} saved in kv for user with id ${compositeId}`);
    return sandbox;
  }

  if(!usersSandboxPromises.has(compositeId)) {
    console.log(`User with id ${compositeId} does not have sandbox promise, creating new one.`);
    const promise = createFunc();
    usersSandboxPromises.set(compositeId, promise);
    await promise;
  }
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

  if (!allowedMethods.includes(method)) {
    throw new Response('Method not allowed', { status: 405 });
  }
  if (!authToken) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const userId = getUserIdFromToken(authToken);
  if(!userId){
    throw new Response('Could not retrieve user id from JWT token.', { status: 401 });
  }
  const params: MethodParams = {
    args,
    identification: {
      context,
      userId: userId,
      uuid
    }
  }
  console.log(`Executing method ${method} for user with id: ${userId}}`);
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
    await createSandboxPromiseIfNotExists(identification);
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

  const sandbox = await getSandbox(identification);
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
    console.log(`Error occurred when getting preview link: ${JSON.stringify(error)}`);
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

  const sandbox = await getSandbox(identification);
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
  const sandbox = await getSandbox(identification);
  try {
    const exists = await sandbox.fileExists(filePath);
    return new Response(JSON.stringify({ exists }),{
      status: 200, headers: { 'Content-Type': 'application/json' }});
  }
  catch (error) {
    return new Response('Failed to check if file exists', { status: 500 });
  }
}

async function deleteFile(params: MethodParams){
  const { args, identification } = params;
  const path = args?.path;

  if (!path || typeof path !== 'string') {
    return new Response('Invalid path for deleteFile method.', { status: 400 });
  }

  const sandbox = await getSandbox(identification);
  try {
    await sandbox.deleteFile(path);
    return new Response('File deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error in deleteFile:', error);
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

  const sandbox = await getSandbox(identification);
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
  const fileBuffer = Buffer.from(fileStr, 'base64');
  if (!remotePath || typeof remotePath !== 'string') {
    return new Response('Invalid remote path for uploadFile method.', { status: 400 });
  }

  const sandbox = await getSandbox(identification);
  try {
    await sandbox.uploadFile(fileBuffer, remotePath);
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

  const sandbox = await getSandbox(identification);
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

  const sandbox = await getSandbox(identification);

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

  const sandbox = await getSandbox(identification);
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

  const sandbox = await getSandbox(identification);
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

  const sandbox = await getSandbox(identification);
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

  const sandbox = await getSandbox(identification);
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

  const sandbox = await getSandbox(identification);
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

  const sandbox = await getSandbox(identification);
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
  const kv = getPersistentKv(identification.context);
  if(usersSandboxPromises.has(compositeId)){
    const sandbox = await usersSandboxPromises.get(compositeId);
    if(!sandbox){
      return new Response('Sandbox instance not found', { status: 404 });
    }
    usersSandboxPromises.delete(compositeId);
    try {
      await sandbox.dispose();
      const existsInKv = await kv.exists(compositeId);
      if(existsInKv){
        await kv.delete(compositeId);
      }
      console.log("Sandbox deleted");
      return new Response('Sandbox disposed successfully', { status: 200 });
    } catch (error) {
      return new Response('Failed to dispose sandbox', { status: 500 });
    }
  }
  return new Response('Sandbox not found for the provided auth token', { status: 404 });
}
