import type { AimpactFs } from '~/lib/aimpactfs/filesystem';
import {workbenchStore} from '~/lib/stores/workbench';
import {getAuthTokenFromCookies} from '~/lib/hooks/useAuth';
import type { Dirent } from '~/lib/stores/files';
import { getAnchorProjectSnapshot, validateAnchorProject } from '~/lib/smartContracts/anchorProjectUtils';

const ANCHOR_PROJECT_FOLDER_NAME = 'src-anchor';

//Class for sending a contract build request to the backend.
//Needed to be able to run build request logic outside of React components.
export class ContractBuildService {

  //Make sure to validate the anchor project via AnchorProjectValidator before calling this method.
  //If the anchor project is invalid an error will be thrown.
  async requestContractBuild(projectId: string): Promise<void>{
    const authToken = getAuthTokenFromCookies();
    if(!authToken) {
      throw new Error('Not authorized');
    }

    const validationResult = validateAnchorProject();
    if(validationResult.status !== 'VALID') {
      throw new Error('Cannot request anchor project build, validation has failed with an error: ' + validationResult.message);
    }
    const anchorProjectSnapshot = getAnchorProjectSnapshot();

    const payload = {
      projectId: projectId,
      snapshot: anchorProjectSnapshot.files
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
