import { useState, useEffect, useCallback } from 'react';
import { billingService } from '../services/api';

export const useBilling = (userId) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await billingService.getHistory(userId);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const pay = async (data) => {
    return billingService.pay({ ...data, userId });
  };

  return { history, loading, pay, refresh: fetchHistory };
};
