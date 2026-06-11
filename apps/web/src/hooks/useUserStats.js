import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/api';

export const useUserStats = (userId) => {
  const { data: userData, isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUser(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  return { userData, loading, refresh };
};
