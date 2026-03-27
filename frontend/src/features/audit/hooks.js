import { useState, useEffect } from 'react';
import { auditApi } from './api';

export const useAuditLogs = (limit = 50, page = 1, excludeLogin = true) => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuditLogs = async (resetLogs = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await auditApi.getAuditLogs(limit, page, excludeLogin);
      
      if (response.success) {
        const newLogs = response.data.logs;
        setPagination(response.data.pagination);
        
        if (resetLogs || page === 1) {
          setLogs(newLogs);
        } else {
          setLogs(prevLogs => [...prevLogs, ...newLogs]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [limit, page, excludeLogin]);

  const refetch = () => {
    return fetchAuditLogs(true);
  };

  return { logs, pagination, loading, error, refetch };
};

// Hook for loading all audit logs with pagination
export const useAllAuditLogs = (excludeLogin = true) => {
  const [allLogs, setAllLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const response = await auditApi.getAuditLogs(50, page, excludeLogin);
      
      if (response.success) {
        const newLogs = response.data.logs;
        setPagination(response.data.pagination);
        
        if (append && page > 1) {
          setAllLogs(prevLogs => [...prevLogs, ...newLogs]);
        } else {
          setAllLogs(newLogs);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (pagination && pagination.hasNextPage && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchLogs(nextPage, true);
    }
  };

  const refresh = () => {
    setCurrentPage(1);
    setAllLogs([]);
    return fetchLogs(1, false);
  };

  useEffect(() => {
    fetchLogs(1, false);
  }, [excludeLogin]);

  return {
    logs: allLogs,
    pagination,
    loading,
    loadingMore,
    error,
    loadMore,
    refresh,
    hasMore: pagination?.hasNextPage || false
  };
};
