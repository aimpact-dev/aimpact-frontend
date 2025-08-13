import type { HybridFs} from '~/lib/aimpactfs/hybridFs';
import type {AimpactShell } from '~/utils/aimpactShell'
import type { FileInfo, Sandbox } from '@daytonaio/sdk';

export class BuildService {
  private shellPromise: Promise<AimpactShell>;
  private sandbox: Promise<Sandbox>;
  private hybridFs: Promise<HybridFs>;

  constructor(shellPromise: Promise<AimpactShell>, sandbox: Promise<Sandbox>, hybridFs: Promise<HybridFs>) {
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
    if (executionResult?.exitCode !== 0) {
      throw new Error(`Build failed with exit code ${executionResult.exitCode}`);
    }

    //Determining the name of the build directory
    const commonBuildDirs = ['dist', 'build'];
    let buildDir = '';
    for (const dir of commonBuildDirs) {
      const fileSearchResult = await sandbox.fs.searchFiles('', dir);
      if(fileSearchResult.files.length > 0){
        buildDir = fileSearchResult.files[0];
        break;
      }
    }

    //Downloading the build directory content and saving to the local filesystem
    const buildDirContent = await this.listSubPaths(buildDir, sandbox);
    for (const file of buildDirContent) {
      if(file.isDir){
        await hybridFs.mkdirLocal(file.path);
      }
      else {
        const fileContent = await sandbox.fs.downloadFile(file.path);
        await hybridFs.writeFileLocal(file.path, fileContent, 'utf-8');
      }
    }

    return {
      path: buildDir,
      exitCode: executionResult.exitCode,
      output: executionResult.output,
    };
  }

  private async listSubPaths(dir: string, sandbox: Sandbox): Promise<{ path: string, isDir: boolean}[]>{
    const files = await sandbox.fs.listFiles(dir);
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
