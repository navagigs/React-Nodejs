import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { APP_SETTINGS_URL, BASE_IMAGE_URL } from './Api';
import { AppConfigContext, APP_CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from './appConfig';

const readCachedConfig = () => {
  try {
    const raw = localStorage.getItem(APP_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (error) {
    console.error(error);
    return DEFAULT_CONFIG;
  }
};

const cacheConfig = (nextConfig) => {
  try {
    localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
  } catch (error) {
    console.error(error);
  }
};

const setMetaTag = (attribute, key, content) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content || '');
};

const applyDocumentMetadata = (config) => {
  const title = config.meta_title || config.site_title || DEFAULT_CONFIG.site_title;
  const description = config.meta_description || config.site_description || DEFAULT_CONFIG.site_description;
  const keywords = config.meta_keywords || DEFAULT_CONFIG.meta_keywords;
  const logoUrl = config.logo ? `${BASE_IMAGE_URL}${config.logo}` : '';

  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'keywords', keywords);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', logoUrl);
  setMetaTag('name', 'twitter:card', 'summary_large_image');
};

export const AppConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(readCachedConfig);
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const response = await fetch(APP_SETTINGS_URL);
      if (!response.ok) throw new Error('Gagal memuat konfigurasi aplikasi');
      const data = await response.json();
      const nextConfig = { ...DEFAULT_CONFIG, ...data };
      setConfig(nextConfig);
      cacheConfig(nextConfig);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    applyDocumentMetadata(config);
  }, [config]);

  const value = useMemo(() => ({
    config,
    loading,
    refreshConfig,
    logoUrl: config.logo ? `${BASE_IMAGE_URL}${config.logo}` : '',
    signatureUrl: config.digital_signature ? `${BASE_IMAGE_URL}${config.digital_signature}` : ''
  }), [config, loading, refreshConfig]);

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
};
