import React from "react";
import { AnchorProjectValidator } from '~/lib/smartContracts/anchorProjectValidator';
import { getAimpactFs } from '~/lib/aimpactfs';
import { toast } from 'react-toastify';
import { ContractBuildService } from '~/lib/smartContracts/contractBuildService';
import { chatId } from '~/lib/persistence';
import { usePostBuildRequest } from '~/lib/hooks/tanstack/useContractBuild';
import { workbenchStore } from '~/lib/stores/workbench';
import type { Dirent } from '~/lib/stores/files';

export function TestAnchorValidatorButton() {
  const { mutateAsync: createContractBuildRequest } = usePostBuildRequest();

  const handleClick = async () => {
    const validator = new AnchorProjectValidator(getAimpactFs());
    const result = await validator.validateAnchorProject();
    if(!result.isValid) {
      toast.error(result.message);
    }
    else{
      toast.success(result.message);

      const files = workbenchStore.files.get();
      const anchorProjectSnapshot: Record<string, Dirent | undefined> = {};
      const anchorPathPrefix = '/home/project/src-anchor';
      Object.entries(files).forEach(([path, item]) => {
        if(path.startsWith(anchorPathPrefix)) {
          const clearedPath = path.replace('/src-anchor' , '');
          anchorProjectSnapshot[clearedPath] = item;
        }
      });
      await createContractBuildRequest({
        projectId: chatId.get()!,
        snapshot: anchorProjectSnapshot
      });
    }
  };

  return (
    <button onClick={handleClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      Test Anchor Validator
    </button>
  );
}
