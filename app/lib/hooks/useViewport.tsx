import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { debounce } from '~/utils/debounce';
import { chatStore } from '../stores/chat';
import { workbenchStore } from '../stores/workbench';
import { useStore } from '@nanostores/react';

type ViewportContextType = {
  width: number;
  isSmallViewport: boolean;
  isMobile: boolean;
};

const ViewportContext = createContext<ViewportContextType | undefined>(undefined);

export const ViewportProvider = ({ children }: { children: ReactNode }) => {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  const { started: chatStarted } = useStore(chatStore);

  useEffect(() => {
    const updateWidth = debounce(() => {
      setWidth(window.innerWidth);
    }, 150); // 150ms debounce

    window.addEventListener('resize', updateWidth);

    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const isSmallViewport = width < 1024;
  const isMobile = width < 768;

  if (chatStarted && (isMobile || !isSmallViewport)) {
    chatStore.setKey('showChat', true);
    workbenchStore.setShowWorkbench(isMobile ? false : true);
  }

  return <ViewportContext.Provider value={{ width, isSmallViewport, isMobile }}>{children}</ViewportContext.Provider>;
};

export const useViewport = () => {
  const context = useContext(ViewportContext);

  if (context === undefined) {
    throw new Error('useViewport must be used inside <ViewportProvider>');
  }

  return context;
};
