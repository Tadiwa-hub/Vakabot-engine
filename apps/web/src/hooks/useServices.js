import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService } from '../services/api';

export const useServices = (userId) => {
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['services', userId],
    queryFn: () => businessService.getServices(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const { mutateAsync: addService } = useMutation({
    mutationFn: (data) => businessService.createService({ ...data, userId }),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['services', userId] });
      const previousServices = queryClient.getQueryData(['services', userId]);
      queryClient.setQueryData(['services', userId], (old = []) => [
        ...old,
        { ...newData, id: `temp-${Date.now()}`, isActive: true, createdAt: new Date().toISOString() },
      ]);
      return { previousServices };
    },
    onError: (err, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(['services', userId], context.previousServices);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    },
  });

  const { mutateAsync: toggleService } = useMutation({
    mutationFn: ({ id, isActive }) => businessService.updateService(id, { userId, isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['services', userId] });
      const previous = queryClient.getQueryData(['services', userId]);
      queryClient.setQueryData(['services', userId], old => old?.map(s => s.id === id ? { ...s, isActive } : s));
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['services', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['services', userId] });
    }
  });

  const { mutateAsync: removeService } = useMutation({
    mutationFn: (id) => businessService.deleteService(id, userId),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['services', userId] });
      const previousServices = queryClient.getQueryData(['services', userId]);
      queryClient.setQueryData(['services', userId], (old = []) => old.filter(s => s.id !== id));
      return { previousServices };
    },
    onError: (err, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(['services', userId], context.previousServices);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    },
  });

  return { services, loading, addService, toggleService: (id, isActive) => toggleService({ id, isActive }), removeService, refresh };
};
