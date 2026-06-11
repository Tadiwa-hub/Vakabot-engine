import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useConversations } from '../hooks/useConversations';

const ConversationsPage = () => {
  const { user } = useUser();
  const { chats, loading, getHistory } = useConversations(user?.id);
  const [selectedJid, setSelectedJid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);

  useEffect(() => {
    if (selectedJid) {
      setLoadingHistory(true);
      getHistory(selectedJid)
        .then(setMessages)
        .finally(() => setLoadingHistory(false));
    }
  }, [selectedJid]);

  const selectedChat = chats.find(c => c.remoteJid === selectedJid);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-text-light">
        <Loader2 className="animate-spin mr-3" size={24} />
        Loading conversations...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] lg:h-[calc(100vh-80px)] animate-in flex gap-6">
      {/* Sidebar List */}
      <div className={`flex-col w-full lg:w-[320px] lg:flex ${showChatMobile ? 'hidden' : 'flex'}`}>
        <div className="mb-4">
          <h1 className="text-24 font-semibold">Conversations</h1>
        </div>
        <Card className="flex-1 overflow-y-auto divide-y divide-border">
          {(!chats || chats.length === 0) ? (
            <div className="p-8 text-center text-[14px] text-text-light">No conversations yet</div>
          ) : chats.map(chat => (
            <button
              key={chat.remoteJid}
              onClick={() => {
                setSelectedJid(chat.remoteJid);
                setShowChatMobile(true);
              }}
              className={`w-full p-4 flex flex-col gap-1 text-left transition-default hover:bg-surface ${selectedJid === chat.remoteJid ? 'bg-accent-glow border-l-2 border-accent' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold truncate">{chat.pushName || chat.remoteJid.split('@')[0]}</span>
                <span className="text-[11px] text-text-light">{new Date(chat.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[13px] text-text-secondary truncate pr-4">{chat.lastMessage}</p>
            </button>
          ))}
        </Card>
      </div>

      {/* Chat View */}
      <div className={`flex-col flex-1 lg:flex ${showChatMobile ? 'flex' : 'hidden'}`}>
        {!selectedJid ? (
          <Card className="flex-1 flex items-center justify-center text-text-light">
            Select a conversation to start chatting
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setShowChatMobile(false)} className="lg:hidden p-2 -ml-2 text-text-secondary"><ArrowLeft size={20} /></button>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold">{selectedChat?.pushName || selectedChat?.remoteJid.split('@')[0]}</h2>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-[11px] text-text-light uppercase font-bold tracking-wider">Active</span>
                </div>
              </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {loadingHistory ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin text-text-light" /></div>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex flex-col ${m.fromMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-[18px] text-[14px] relative ${m.fromMe ? 'bg-primary text-white rounded-br-none' : 'bg-surface-2 text-text-primary rounded-bl-none'}`}>
                      {m.content}
                      {m.responseType && m.responseType !== 'manual' && (
                        <div className="absolute -top-6 right-0"><Badge variant={m.responseType}>{m.responseType.toUpperCase()}</Badge></div>
                      )}
                    </div>
                    <span className="text-[10px] text-text-light mt-1 px-1">{new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-surface">
                <div className="relative">
                  <input type="text" placeholder="Type a message..." className="w-full h-10 pl-4 pr-10 bg-background border border-border rounded-full text-[14px] focus:outline-none focus:border-accent transition-default" disabled />
                  <button className="absolute right-1 top-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"><Send size={16} /></button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      <style>{`
        .animate-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default ConversationsPage;
