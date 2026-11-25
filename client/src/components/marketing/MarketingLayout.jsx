import React from 'react';
import FinanceLayout from '../finance/FinanceLayout';

const MarketingLayout = ({ title, subtitle, actions, filters, children }) => (
  <FinanceLayout title={title} subtitle={subtitle} actions={actions}>
    {filters ? <section className="app-filter">{filters}</section> : null}
    {children}
  </FinanceLayout>
);

export default MarketingLayout;
