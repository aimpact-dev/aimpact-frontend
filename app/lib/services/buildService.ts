import type { HybridFs} from '~/lib/aimpactfs/hybridFs';
import type {AimpactShell } from '~/utils/aimpactShell'
import type { FileInfo, Sandbox } from '@daytonaio/sdk';
import { getEncoding } from 'istextorbinary';
import { Buffer } from 'node:buffer';
import {readContent, isBinaryFile} from '~/utils/fileContentReader'
import type { FileMap } from '~/lib/stores/files';
import type { LazySandbox } from '~/lib/daytona/lazySandbox';

export class BuildService {
  private shellPromise: Promise<AimpactShell>;
  private sandbox: Promise<LazySandbox>;
  private hybridFs: Promise<HybridFs>;

  constructor(shellPromise: Promise<AimpactShell>, sandbox: Promise<LazySandbox>, hybridFs: Promise<HybridFs>) {
    this.hybridFs = hybridFs;
    this.sandbox = sandbox;
    this.shellPromise = shellPromise;
  }

  async runBuildScript(buildWith: 'npm' | 'pnpm'){
    const shell = await this.shellPromise
    const sandbox = await this.sandbox;
    const hybridFs = await this.hybridFs;

    const onAbort = () =>{
      console.log("Build aborted");
    }
    const command = buildWith === 'npm' ? 'npm run build' : 'pnpm run build';
    const executionResult = await shell.executeCommand(command, onAbort);
    if (executionResult?.exitCode !== 0 && executionResult?.exitCode !== 137) {
      console.error(`Build failed with exit code ${executionResult?.exitCode}`);
      return {
        path: '',
        exitCode: executionResult?.exitCode,
        output: executionResult?.output,
      }
    }

    //Determining the name of the build directory
    const commonBuildDirs = ['dist', 'build'];
    let buildDir = '';
    for (const dir of commonBuildDirs) {
      console.log(`Checking build directory: ${dir}`);
      const fileSearchResult = await sandbox.searchFiles(dir, '*.*');
      if(!fileSearchResult || !fileSearchResult.files) continue;
      if(fileSearchResult.files.length > 0){
        buildDir = dir;
        console.log(`Found build directory: ${buildDir}`);
        break;
      }
    }
    console.log("Found build directory:", buildDir);

    //Delete the local build directory if it exists
    try{
      await hybridFs.rmLocal(buildDir, { recursive: true, force: true });
    }
    catch(error){
      console.error("Error deleting local build directory:", error);
    }

    //Downloading the build directory content and saving to the local filesystem
    const fileMap: FileMap = {};
    const buildDirContent = await this.listSubPaths(buildDir, sandbox);
    await hybridFs.mkdirLocal(buildDir); // Create the build directory locally
    const workDir = await hybridFs.workdir();
    console.log("Remote build directory content: ", buildDirContent);
    for (const file of buildDirContent) {
      if(file.isDir){
        console.log("Creating directory for build:", file.path);
        await hybridFs.mkdirLocal(file.path);
        fileMap[workDir + '/' + file.path] = {
          type: 'folder',
          pending: false
        }
      }
      else {
        console.log("Creating file for build:", file.path);
        const fileContent = await sandbox.downloadFile(file.path);
        await hybridFs.writeFileLocal(file.path, fileContent, 'utf-8');
        const stringContent = readContent(fileContent);
        const isBinary = isBinaryFile(fileContent);
        fileMap[workDir + '/' + file.path] = {
          type: 'file',
          content: stringContent,
          isBinary: isBinary,
          pending: false
        }
      }
    }

    return {
      path: buildDir,
      exitCode: executionResult.exitCode,
      output: executionResult.output,
      fileMap: fileMap,
    };
  }

  private async listSubPaths(dir: string, sandbox: LazySandbox): Promise<{ path: string, isDir: boolean}[]>{
    const files = await sandbox.listFiles(dir);
    const subPaths: { path: string, isDir: boolean}[] = [];

    for (const file of files) {
      const path = dir +'/' + file.name;
      subPaths.push({ path: path, isDir: file.isDir });
      if (file.isDir) {
        const subFiles = await this.listSubPaths(path, sandbox);
        subPaths.push(...subFiles);
      }
    }

    return subPaths;
  }
}
