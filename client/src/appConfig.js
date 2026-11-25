import { createContext } from 'react';

export const DEFAULT_CONFIG = {
  site_title: 'Admin Panel',
  site_description: 'StrikingDash React Web Application',
  logo: '',
  digital_signature: '',
  meta_title: 'Admin Panel',
  meta_description: 'StrikingDash React Web Application',
  meta_keywords: 'admin, dashboard, react'
};

export const APP_CONFIG_STORAGE_KEY = 'app_config';

export const AppConfigContext = createContext(null);
