import { useQuery } from '@tanstack/react-query';
import { conversationService } from '../services/api';

export const useConversations = (userId) => {
  const { data: chats = [], isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => conversationService.getChats(userId),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });

  const getHistory = async (remoteJid) => {
    if (!userId || !remoteJid) return [];
    return conversationService.getHistory(userId, remoteJid);
  };

  return { chats, loading, getHistory, refresh };
};
