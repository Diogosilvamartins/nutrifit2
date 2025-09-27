import React from 'react';
import { FiscalProvider } from '@/hooks/useFiscal';
import { FiscalDashboard } from './FiscalDashboard';

export function FiscalModule() {
  return (
    <FiscalProvider>
      <FiscalDashboard />
    </FiscalProvider>
  );
}