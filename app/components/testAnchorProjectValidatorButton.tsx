import React from "react";
import { AnchorProjectValidator } from '~/lib/smartContracts/anchorProjectValidator';
import { getAimpactFs } from '~/lib/aimpactfs';
import { toast } from 'react-toastify';
import { ContractBuildService } from '~/lib/smartContracts/contractBuildService';
import { chatId } from '~/lib/persistence';

export function TestAnchorValidatorButton() {


  const handleClick = async () => {
    const validator = new AnchorProjectValidator(getAimpactFs());
    const result = await validator.validateAnchorProject();
    if(!result.isValid) {
      toast.error(result.message);
    }
    else{
      toast.success(result.message);
      const contractBuildService = new ContractBuildService(validator, getAimpactFs());
      await contractBuildService.requestContractBuild(chatId.get()!)
    }
  };

  return (
    <button onClick={handleClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      Test Anchor Validator
    </button>
  );
}
