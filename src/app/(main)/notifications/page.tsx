'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import type { Notification } from '@/types';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  match_application: { label: '매치 신청', color: 'bg-accent/10 text-accent' },
  match_accepted: { label: '매치 수락', color: 'bg-success/10 text-success' },
  match_rejected: { label: '매치 거절', color: 'bg-danger/10 text-danger' },
  new_message: { label: '새 메시지', color: 'bg-primary/10 text-primary' },
  contest_application: { label: '팀원 신청', color: 'bg-contest/10 text-contest' },
  contest_accepted: { label: '팀원 수락', color: 'bg-success/10 text-success' },
  contest_rejected: { label: '팀원 거절', color: 'bg-danger/10 text-danger' },
  match_cancelled: { label: '매치 취소', color: 'bg-muted/10 text-muted' },
  report_warning: { label: '경고', color: 'bg-danger/10 text-danger' },
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setNotifications(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">알림</h1>
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          모두 읽음
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-primary/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">알림이 없습니다</h3>
          <p className="text-sm text-text-secondary">새로운 활동이 있으면 여기에 알려드려요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const typeInfo = TYPE_LABELS[n.type] || { label: n.type, color: 'bg-muted/10 text-muted' };
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  n.is_read
                    ? 'bg-card border-border'
                    : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1.5 ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <p className={`text-sm ${n.is_read ? 'text-text-secondary' : 'text-text font-medium'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {new Date(n.created_at).toLocaleString('ko-KR', {
                        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
