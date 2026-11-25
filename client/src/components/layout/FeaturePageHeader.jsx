import React from 'react';
import { useLocation } from 'react-router-dom';
import { useMenuTitle } from '../../permissions';

const FeaturePageHeader = ({ title, subtitle, actions }) => {
  const location = useLocation();
  const menuTitle = useMenuTitle(location.pathname, title);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{menuTitle}</h1>
        {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
};

export default FeaturePageHeader;
