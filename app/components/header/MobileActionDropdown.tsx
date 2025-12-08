import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { classNames } from '~/utils/classNames';
import { useParams } from '@remix-run/react';
import { useGetHeavenToken } from '~/lib/hooks/tanstack/useHeaven';
import DeployTokenNavButton from '../chat/DeployTokenNavButton';
import TokenInfoNavButton from '../chat/TokenInfoButton';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';

export default function MobileActionDropdown() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const params = useParams();
  const tokenInfoQuery = params.id ? useGetHeavenToken(params.id) : null;

  const openView = (view: WorkbenchViewType) => {
    workbenchStore.setShowWorkbench(true);
    workbenchStore.setCurrentView(view);
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger>
        <div className="flex gap-2 text-sm h-full">
          <div
            className={classNames(
              'flex items-center p-1.5  bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent border border-bolt-elements-borderColor rounded-md m-0',
              isDropdownOpen ? 'border-bolt-elements-borderColorActive' : '',
            )}
          >
            <div className="i-ph:dots-three-bold w-5 h-5" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {params.id && (
          <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
            {!tokenInfoQuery?.data && (
              <div className="h-full">
                <DeployTokenNavButton projectId={params.id} disabled={tokenInfoQuery?.isLoading ?? true} isMobile />
              </div>
            )}
            {tokenInfoQuery?.data && (
              <div className="h-full">
                <TokenInfoNavButton tokenData={tokenInfoQuery.data} isMobile />
              </div>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem>
          <button onClick={() => openView('contracts')}>Smart contracts</button>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <button onClick={() => openView('convex')}>Convex</button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
