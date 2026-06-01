'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Send, Loader2, LogOut } from 'lucide-react';
import type { Message, Profile } from '@/types';

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const roomId = params.roomId as string;

  const [messages, setMessages] = useState<(Message & { sender: Profile })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // 채팅방 정보
      const { data: room } = await supabase
        .from('message_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (room) {
        const otherId = room.participant_1 === user.id ? room.participant_2 : room.participant_1;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherId)
          .single();
        if (otherProfile) setOtherUser(otherProfile);
      }

      // 메시지 조회
      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(*)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (msgs) setMessages(msgs as (Message & { sender: Profile })[]);

      // 읽음 처리
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .neq('sender_id', user.id);

      setLoading(false);
    };
    init();
  }, [roomId]);

  // 자동 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // sender 정보 조회
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single();

          setMessages((prev) => {
            // 중복 방지
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender: sender as Profile }];
          });

          // 읽음 처리
          if (newMsg.sender_id !== currentUserId) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: currentUserId,
      content,
    });

    if (error) {
      setNewMessage(content);
      alert('메시지 전송에 실패했습니다.');
    }
    setSending(false);
  };

  const handleLeave = async () => {
    if (!confirm('채팅방을 나가시겠습니까? 모든 대화 내용이 삭제됩니다.')) return;
    await supabase.from('message_rooms').delete().eq('id', roomId);
    router.push('/messages');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/messages')} className="p-2 rounded-xl hover:bg-primary/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-text" />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">{otherUser?.nickname?.[0] || '?'}</span>
          </div>
          <div>
            <h2 className="font-semibold text-text text-sm">{otherUser?.nickname || '알 수 없음'}</h2>
            <p className="text-xs text-muted">{otherUser?.department || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          나가기
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted text-sm">
            첫 메시지를 보내 대화를 시작하세요!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                {!isMe && (
                  <span className="text-xs text-muted ml-1 mb-1 block">
                    {msg.sender?.nickname}
                  </span>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-card border border-border text-text rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
                <span className={`text-[10px] text-muted mt-0.5 block ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-3 border-t border-border">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-white text-text text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          autoFocus
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-3 bg-primary text-white rounded-xl hover:bg-primary-light transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
