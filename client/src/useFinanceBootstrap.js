import { useEffect, useState } from 'react';
import { getFinanceBootstrap } from './financeApi';

const useFinanceBootstrap = () => {
  const [bootstrap, setBootstrap] = useState({ income_categories: {}, expense_categories: {}, accounts: [], cash_accounts: [], can_approve: false, settings: {} });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getFinanceBootstrap()
      .then((result) => {
        if (!active) return;
        setBootstrap({
          income_categories: result?.income_categories || {},
          expense_categories: result?.expense_categories || {},
          accounts: result?.accounts || [],
          cash_accounts: result?.cash_accounts || [],
          can_approve: !!result?.can_approve,
          settings: result?.settings || {}
        });
      })
      .catch((err) => active && setError(err.message || 'Gagal memuat data pendukung keuangan'));
    return () => { active = false; };
  }, []);

  return { bootstrap, error };
};

export default useFinanceBootstrap;
