import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insightService } from '../services/api';

export const useInsights = (userId) => {
  const queryClient = useQueryClient();

  const { data: insights = [], isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['insights', userId],
    queryFn: () => insightService.getInsights(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const { mutateAsync: dismissInsight } = useMutation({
    mutationFn: (insightId) => insightService.dismissInsight(userId, insightId),
    onMutate: async (insightId) => {
      await queryClient.cancelQueries({ queryKey: ['insights', userId] });
      const previous = queryClient.getQueryData(['insights', userId]);
      queryClient.setQueryData(['insights', userId], (old = []) => old.filter(ins => ins.id !== insightId));
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['insights', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', userId] });
    }
  });

  return { insights, loading, dismissInsight, refresh };
};
