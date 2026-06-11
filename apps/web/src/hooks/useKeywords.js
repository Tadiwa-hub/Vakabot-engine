import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keywordService } from '../services/api';

export const useKeywords = (userId) => {
  const queryClient = useQueryClient();

  const { data: keywords = [], isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['keywords', userId],
    queryFn: () => keywordService.getKeywords(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const { mutateAsync: addKeyword } = useMutation({
    mutationFn: (data) => keywordService.createKeyword({ ...data, userId }),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['keywords', userId] });
      const previousKeywords = queryClient.getQueryData(['keywords', userId]);
      queryClient.setQueryData(['keywords', userId], (old = []) => [
        ...old,
        { ...newData, id: `temp-${Date.now()}`, isActive: true, usageCount: 0, createdAt: new Date().toISOString() },
      ]);
      return { previousKeywords };
    },
    onError: (err, variables, context) => {
      if (context?.previousKeywords) {
        queryClient.setQueryData(['keywords', userId], context.previousKeywords);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    },
  });

  const { mutateAsync: toggleKeyword } = useMutation({
    mutationFn: ({ id, isActive }) => keywordService.updateKeyword(id, { userId, isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['keywords', userId] });
      const previous = queryClient.getQueryData(['keywords', userId]);
      queryClient.setQueryData(['keywords', userId], old => old?.map(k => k.id === id ? { ...k, isActive } : k));
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['keywords', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['keywords', userId] });
    }
  });

  const { mutateAsync: removeKeyword } = useMutation({
    mutationFn: (id) => keywordService.deleteKeyword(id, userId),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['keywords', userId] });
      const previousKeywords = queryClient.getQueryData(['keywords', userId]);
      queryClient.setQueryData(['keywords', userId], (old = []) => old.filter(kw => kw.id !== id));
      return { previousKeywords };
    },
    onError: (err, variables, context) => {
      if (context?.previousKeywords) {
        queryClient.setQueryData(['keywords', userId], context.previousKeywords);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    },
  });

  return { keywords, loading, addKeyword, toggleKeyword: (id, isActive) => toggleKeyword({ id, isActive }), removeKeyword, refresh };
};
