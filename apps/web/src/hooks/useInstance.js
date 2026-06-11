import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instanceService } from '../services/api';

export const useInstance = (userId) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [codeStatus, setCodeStatus] = useState('idle'); // idle / loading / active / expired / connected
  const codeReceivedRef = useRef(false);

  const { data: instanceData, isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['instance', userId],
    queryFn: () => instanceService.getInstance(userId),
    enabled: !!userId,
    refetchInterval: (query) => {
       const status = query.state.data?.instance?.status;
       const isPairing = status !== 'CONNECTED' && codeReceivedRef.current;
       return isPairing ? 3000 : 10000;
    },
  });

  const instance = instanceData?.instance || null;

  // Sync UI state based on instance status changes
  useEffect(() => {
    if (instance) {
      if (instance.status === 'CONNECTED') {
        setCodeStatus('connected');
      } else if (instance.status === 'DISCONNECTED' && codeStatus === 'connected') {
        setCodeStatus('idle');
      }
    } else if (instanceData && !instanceData.instance && codeStatus === 'connected') {
      setCodeStatus('idle');
    }
  }, [instance?.status, instanceData]);

  const { mutateAsync: createMutation } = useMutation({
    mutationFn: ({ phoneNumber, email }) => instanceService.createInstance({ userId, phoneNumber, email }),
    onSuccess: (data) => {
      queryClient.setQueryData(['instance', userId], data);
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    }
  });

  const create = async (phoneNumber, email) => {
    if (!userId) return;
    setPairingCode(null);
    setCodeStatus('loading');
    codeReceivedRef.current = false;
    
    try {
      const data = await createMutation({ phoneNumber, email });
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
        setCodeStatus('active');
        codeReceivedRef.current = true;
      }
    } catch (err) {
      setError(err.message);
      setCodeStatus('idle');
      throw err;
    }
  };

  const { mutateAsync: toggleMutation } = useMutation({
    mutationFn: (isActive) => instanceService.toggleInstance(userId, isActive),
    onMutate: async (isActive) => {
      await queryClient.cancelQueries({ queryKey: ['instance', userId] });
      const previous = queryClient.getQueryData(['instance', userId]);
      if (previous?.instance) {
        queryClient.setQueryData(['instance', userId], {
          ...previous,
          instance: { ...previous.instance, isActive }
        });
      }
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    }
  });

  const toggle = async (isActive) => {
    if (!userId) return;
    try {
      await toggleMutation(isActive);
    } catch (err) {
      setError(err.message);
    }
  };

  const cleanup = async (instanceName) => {
    if (!instanceName) return;
    try {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/instance/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName })
      });
    } catch (e) {}
  };

  const { mutateAsync: disconnectMutation } = useMutation({
    mutationFn: () => instanceService.disconnectInstance(userId),
    onSuccess: () => {
      queryClient.setQueryData(['instance', userId], { instance: null });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    }
  });

  const disconnect = async () => {
    if (!userId) return;
    try {
      await disconnectMutation();
      setPairingCode(null);
      setCodeStatus('idle');
      codeReceivedRef.current = false;
    } catch (err) {
      setError(err.message);
    }
  };

  return { 
    instance, 
    loading, 
    error, 
    create, 
    toggle,
    disconnect, 
    cleanup,
    pairingCode, 
    codeStatus, 
    setCodeStatus,
    refresh 
  };
};

