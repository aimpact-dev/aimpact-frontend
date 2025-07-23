import { logger } from "~/utils/logger";
import { TerminalStore } from "../stores/terminal";
import { path as nodePath } from '~/utils/path';;
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import type { BoltShell } from "~/utils/shell";


export class DeployService {
  #webcontainer: Promise<WebContainer>;
  #activeBuildProcess: WebContainerProcess | null = null;

  constructor(
    webcontainerPromise: Promise<WebContainer>,
  ) {
    this.#webcontainer = webcontainerPromise;
  }

  cleanup() {
    logger.debug('Cleaning up DeployService, killing active process...');
    if (this.#activeBuildProcess) {
      try {
        this.#activeBuildProcess.kill();
      } catch (error) {
        logger.error('Error killing active build process during cleanup:', error);
      }
      this.#activeBuildProcess = null;
    }
  }

  async runDeployScript() {;
    const webcontainer = await this.#webcontainer;

    // Create a new terminal specifically for the build
    const buildProcess = await webcontainer.spawn('pnpm', ['run', 'build']);
    this.#activeBuildProcess = buildProcess;

    console.log(buildProcess);
    let output = '';
    let buildCompleted = false;

    buildProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
          if (data.includes('✓ built in') || data.includes('Build completed')) {
            buildCompleted = true;
            setTimeout(() => {
              buildProcess.kill();
            }, 2000);
          }
        }
      }),
    );

    buildProcess.exit.then(exitCode => {
      console.log(`Process exited with code: ${exitCode}`);
    });

    const exitCode = await buildProcess.exit;

    if (exitCode === 143 || exitCode === 0) {
      console.log("Build completed")
    } else {
      // Trigger build failed alert
      throw new Error('Build Failed' + "\n" + output || 'No Output Available');
    }

    // Check for common build directories
    const commonBuildDirs = ['dist', 'build'];

    let buildDir = '';

    // Try to find the first existing build directory
    for (const dir of commonBuildDirs) {
      const dirPath = nodePath.join(webcontainer.workdir, dir);

      try {
        await webcontainer.fs.readdir(dirPath);
        buildDir = dirPath;
        logger.debug(`Found build directory: ${buildDir}`);
        break;
      } catch (error) {
        // Directory doesn't exist, try the next one
        logger.debug(`Build directory ${dir} not found, trying next option. ${error}`);
      }
    }

    // If no build directory was found, use the default (dist)
    if (!buildDir) {
      buildDir = nodePath.join(webcontainer.workdir, 'dist');
      logger.debug(`No build directory found, defaulting to: ${buildDir}`);
    }

    return {
      path: buildDir,
      exitCode,
      output,
    };
  }
}