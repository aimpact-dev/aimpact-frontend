import { getAnchorProjectSnapshot, validateAnchorProject } from '~/lib/smartContracts/anchorProjectUtils';
import { client } from '../api/backend/api';
import axios from 'axios';


/**
 * @class ContractBuildService
 * @description Class for sending a contract build request to the backend.
 * Needed to be able to run build request logic outside of React components.
 */
export class ContractBuildService {

  //Make sure to validate the anchor project via validateAnchorProject before calling this method.
  //If the anchor project is invalid an error will be thrown.
  async requestContractBuild(projectId: string): Promise<void>{
    const validationResult = validateAnchorProject();
    if(validationResult.status !== 'VALID') {
      throw new Error('Cannot request anchor project build, validation has failed with an error: ' + validationResult.message);
    }
    const anchorProjectSnapshot = getAnchorProjectSnapshot(false);

    const payload = {
      projectId: projectId,
      snapshot: anchorProjectSnapshot.files
    }
    try{
      await client.post('/build-contract/build-request', payload);
    }
    catch (error) {
      if(axios.isAxiosError(error)){
        console.error("Contract build request failed with status code: " + error.response?.status +
          "\nData: " + error.response?.data + "\nMessage: " + error.message + "\nCode: " + error.code);
        throw new Error("Could not request smart contract build. HTTP request failed with status code: " + error.response?.status);
      }
      else{
        console.error("Could not request contract build, an unknown error occurred. Error: " + error);
        throw new Error("Could not request smart contract build. Error: " + error);
      }
    }
  }
}
