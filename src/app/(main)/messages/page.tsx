'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MessageCircle, Loader2 } from 'lucide-react';
import type { MessageRoom, Profile } from '@/types';

export default function MessagesPage() {
  const supabase = createClient();
  const [rooms, setRooms] = useState<(MessageRoom & { other_user: Profile; last_message?: { content: string; created_at: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'match' | 'contest'>('match');

  useEffect(() => {
    const fetchRooms = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('message_rooms')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (data) {
        const roomsWithUsers = await Promise.all(
          data.map(async (room: MessageRoom) => {
            const otherId = room.participant_1 === user.id ? room.participant_2 : room.participant_1;
            const { data: otherUser } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherId)
              .single();

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return { ...room, other_user: otherUser, last_message: lastMsg } as never;
          })
        );
        setRooms(roomsWithUsers);
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">메시지</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('match')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'match'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-text-secondary'
          }`}
        >
          매치 채팅
        </button>
        <button
          onClick={() => setActiveTab('contest')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'contest'
              ? 'bg-contest text-white'
              : 'bg-card border border-border text-text-secondary'
          }`}
        >
          공모전 팀 채팅
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : activeTab === 'match' ? (
        rooms.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">채팅이 없습니다</h3>
            <p className="text-sm text-text-secondary">매치가 확정되면 채팅이 자동으로 생성됩니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/messages/${room.id}`}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/20 hover:shadow-card-hover transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-semibold">{room.other_user?.nickname?.[0] || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-text">{room.other_user?.nickname || '알 수 없음'}</h3>
                  <p className="text-sm text-muted truncate">{room.last_message?.content || '새 채팅방'}</p>
                </div>
                {room.last_message && (
                  <span className="text-xs text-muted shrink-0">
                    {new Date(room.last_message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-20">
          <MessageCircle className="w-12 h-12 text-contest/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">팀 채팅이 없습니다</h3>
          <p className="text-sm text-text-secondary">공모전 팀원 신청이 수락되면 팀 채팅이 생성됩니다.</p>
        </div>
      )}
    </div>
  );
}
