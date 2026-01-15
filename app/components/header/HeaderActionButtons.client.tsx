import { useStore } from '@nanostores/react';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import MobileActionDropdown from './MobileActionDropdown';
import { Button } from '../ui';
import { twMerge } from 'tailwind-merge';

interface Props {
  isMobile?: boolean;
}

export function HeaderActionButtons({ isMobile = false }: Props) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  const openView = (view: WorkbenchViewType) => {
    workbenchStore.setShowWorkbench(true);
    workbenchStore.setCurrentView(view);
  };

  return (
    isMobile && (
      <>
        <div className={twMerge('flex justify-end w-full mx-auto mt-2', showWorkbench ? 'px-2' : 'max-w-chat')}>
          <div className="flex gap-1 items-center">
            <Button
              variant={'ghost'}
              className="rounded-md text-sm px-4 !h-[34px] bg-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor"
              onClick={() => openView('preview')}
            >
              Preview
            </Button>
            <MobileActionDropdown />
          </div>
        </div>
      </>
    )
  );
}
