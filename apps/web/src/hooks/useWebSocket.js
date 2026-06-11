import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useWebSocket = (userId) => {
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Convert HTTP VITE_API_URL to WS/WSS
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + '/ws';

    console.log(`[WebSocket] Connecting to: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connection established successfully.');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[WebSocket] Event received:', payload);

        // Filter events so we only handle messages matching our current logged-in userId
        if (payload.userId !== userId) return;

        if (payload.type === 'NEW_MESSAGE') {
          const newMessage = payload.data;

          // 1. Instantly update the dashboard query cache to prepend the new activity
          queryClient.setQueryData(['dashboard', userId], (oldData) => {
            if (!oldData) return oldData;

            // Increment messagesToday and aiUsed stats dynamically!
            const isMe = newMessage.type !== 'incoming';
            const isAi = newMessage.type === 'ai';
            const updatedStats = {
              ...oldData.stats,
              messagesToday: (oldData.stats?.messagesToday || 0) + 1,
              keywordsMatched: (oldData.stats?.keywordsMatched || 0) + (newMessage.type === 'keyword' ? 1 : 0),
              recentActivity: [
                // Reconstruct to match the database message format
                {
                  id: newMessage.id,
                  remoteJid: `${newMessage.phone}@s.whatsapp.net`,
                  content: newMessage.message,
                  timestamp: Math.floor(Date.now() / 1000),
                  responseType: newMessage.type === 'incoming' ? null : newMessage.type
                },
                ...(oldData.stats?.recentActivity || [])
              ].slice(0, 15) // Keep a tight scroll of 15 logs
            };

            const updatedUser = {
              ...oldData.user,
              aiUsageCount: (oldData.user?.aiUsageCount || 0) + (isMe && isAi ? 1 : 0)
            };

            return {
              ...oldData,
              stats: updatedStats,
              user: updatedUser
            };
          });

          // 2. Invalidate other caches in the background silently
          queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message event:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[WebSocket] Error occurred:', err);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Closed (code:', event.code, '). Attempting reconnect in 5s...');
      socketRef.current = null;
      // Reconnect with exponential backoff/delay
      setTimeout(() => {
        if (userId) {
          // Trigger a re-render of this hook to establish a new socket connection
          queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
        }
      }, 5000);
    };

    return () => {
      console.log('[WebSocket] Cleaning up socket connection...');
      ws.close();
      socketRef.current = null;
    };
  }, [userId, queryClient]);

  return socketRef.current;
};
