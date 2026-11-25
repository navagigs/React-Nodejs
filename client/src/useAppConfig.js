import { useContext } from 'react';
import { AppConfigContext, DEFAULT_CONFIG } from './appConfig';

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (!context) {
    return {
      config: DEFAULT_CONFIG,
      loading: false,
      refreshConfig: () => {},
      logoUrl: '',
      signatureUrl: ''
    };
  }
  return context;
};
