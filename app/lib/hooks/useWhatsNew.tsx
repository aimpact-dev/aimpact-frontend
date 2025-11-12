import React, { createContext, useContext, useState } from 'react';

interface WhatsNewContextType {
  showWhatsNew: boolean;
  setShowWhatsNew: (value: boolean) => void;
}

const WhatsNewContext = createContext<WhatsNewContextType | undefined>(undefined);

interface WhatsNewProviderProps {
  children: React.ReactNode;
}

export const WhatsNewProvider = ({ children }: WhatsNewProviderProps) => {
  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);

  return <WhatsNewContext.Provider value={{ showWhatsNew, setShowWhatsNew }}>{children}</WhatsNewContext.Provider>;
};

export const useWhatsNew = (): WhatsNewContextType => {
  const context = useContext(WhatsNewContext);
  if (!context) {
    throw new Error('useWhatsNew must be used within a WhatsNewProvider');
  }
  return context;
};
