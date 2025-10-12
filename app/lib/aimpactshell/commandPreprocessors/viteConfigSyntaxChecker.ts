import  { type CommandPreprocessor } from '~/lib/aimpactshell/commandPreprocessors/commandPreprocessor';
import { BUILD_COMMANDS, PREVIEW_COMMANDS } from '~/lib/aimpactshell/commandPreprocessors/commandsLists';
import { parse } from '@babel/parser';
import { path } from '~/utils/path';
import { VITE_CONFIG_FILE } from '~/lib/aimpactshell/commandPreprocessors/constants';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import { getWorkbenchStore } from '~/lib/stores/workbench';

export class ViteConfigSyntaxChecker implements CommandPreprocessor {
  private readonly aimpactFs: Promise<AimpactFs>;

  constructor(aimpactFs: Promise<AimpactFs>) {
    this.aimpactFs = aimpactFs;
  }


  async process(command: string): Promise<string> {
    const shouldProcess = BUILD_COMMANDS.includes(command) || PREVIEW_COMMANDS.includes(command);
    if(!shouldProcess) return Promise.resolve(command);

    const fs = await this.aimpactFs;
    const workdir = await fs.workdir();
    let viteConfigFile: string;
    try {
      viteConfigFile = await fs.readFile(path.join(workdir, VITE_CONFIG_FILE), 'utf-8');
    } catch (err: any) {
      // If the file does not exist, skip the syntax check and return the command
      if (err && (err.code === 'ENOENT' || err.message?.includes('no such file'))) {
        return Promise.resolve(command);
      } else {
        // For other errors, alert the user
        getWorkbenchStore().actionAlert.set (
          {
            type: 'error',
            title: 'Error reading vite.config.ts',
            description: 'An error occurred while reading vite.config.ts: ' + err,
            content: `When running "${command}", we encountered an error reading vite.config.ts: ${err}.`,
            source: 'terminal'
          }
        );
        return Promise.resolve('');
      }
    }

    try{
      parse(viteConfigFile, {
        sourceType: 'module',
        plugins: ['typescript'],
        strictMode: false,
      });
    } catch(err){
      // Extract a user-friendly error message
      const errorMessage = (err && typeof err === 'object' && 'message' in err) ? (err as Error).message : String(err);
      getWorkbenchStore().actionAlert.set (
        {
          type: 'error',
          title: 'Syntax Error in vite.config.ts',
          description: 'An error was detected when parsing vite.config.ts: ' + errorMessage,
          content: `When running "${command}", we encountered an error during vite.config.ts parsing: ${errorMessage}.`,
          source: 'terminal'
        }
      );
      return Promise.resolve('');
    }


    return Promise.resolve(command);
  }
}
