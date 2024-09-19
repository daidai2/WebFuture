/*
Global Variable that Control Version
*/

"use client";

import React, { createContext, useContext, ReactNode, useState } from 'react';

type VersionContextType = {
  selectedVersion: string | null;
  maxVersion: string | null;
  setSelectedVersion: (version: string | null) => void;
  setMaxVersion: (version: string | null) => void;
};

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const useVersionContext = () => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersionContext must be used within a VersionProvider');
  }
  return context;
};

type VersionProviderProps = {
  children: ReactNode;
};

export const VersionProvider: React.FC<VersionProviderProps> = ({ children }) => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [maxVersion, setMaxVersion] = useState<string | null>(null);

  return (
    <VersionContext.Provider value={{ selectedVersion, maxVersion, setSelectedVersion, setMaxVersion }}>
      {children}
    </VersionContext.Provider>
  );
};
