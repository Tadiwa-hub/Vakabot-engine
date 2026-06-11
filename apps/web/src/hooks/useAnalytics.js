import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/api';

export const useAnalytics = (userId) => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;
    try {
      const [statsData, chartsData] = await Promise.all([
        analyticsService.getStats(userId),
        analyticsService.getCharts(userId)
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { stats, charts, loading, refresh: fetchAnalytics };
};
