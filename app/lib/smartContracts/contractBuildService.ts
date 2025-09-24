import type { AnchorProjectValidator } from '~/lib/smartContracts/anchorProjectValidator';
import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import {workbenchStore} from '~/lib/stores/workbench';
import {getAuthTokenFromCookies} from '~/lib/hooks/useAuth';
import type { Dirent } from '~/lib/stores/files';

const ANCHOR_PROJECT_FOLDER_NAME = 'src-anchor';

//Class for sending a contract build request to the backend.
//Needed to be able to run build request logic outside of React components.
export class ContractBuildService {
  private readonly projectValidator: AnchorProjectValidator;
  private readonly fsPromise: Promise<AimpactFs>;

  constructor(projectValidator: AnchorProjectValidator, fsPromise: Promise<AimpactFs>) {
    this.projectValidator = projectValidator;
    this.fsPromise = fsPromise;
  }

  //Make sure to validate the anchor project via AnchorProjectValidator before calling this method.
  //If the anchor project is invalid an error will be thrown.
  async requestContractBuild(projectId: string): Promise<void>{
    const authToken = getAuthTokenFromCookies();
    if(!authToken) {
      throw new Error('Not authorized');
    }

    const validationResult = await this.projectValidator.validateAnchorProject();
    if(!validationResult.isValid){
      throw new Error("Cannot request smart contract build, a validation error occurred: " + validationResult.message);
    }

    const fs = await this.fsPromise;
    const workDir = await fs.workdir();
    const files = workbenchStore.files.get();
    const anchorProjectSnapshot: Record<string, Dirent | undefined> = {};
    const anchorPathPrefix = workDir + '/' + ANCHOR_PROJECT_FOLDER_NAME;
    Object.entries(files).forEach(([path, item]) => {
      if(path.startsWith(anchorPathPrefix)) {
        const clearedPath = path.replace('/' + ANCHOR_PROJECT_FOLDER_NAME, '');
        anchorProjectSnapshot[clearedPath] = item;
      }
    });

    const payload = {
      projectId: projectId,
      snapshot: anchorProjectSnapshot
    }
    const response = await fetch(`${import.meta.env.PUBLIC_BACKEND_URL}/build-contract/build-request`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.log("Contract build request failed with status code: " + response.status + ". Response text: " + await response.text());
      throw new Error("Could not request smart contract build. HTTP request failed with status code: " + response.status);
    }
  }
}
