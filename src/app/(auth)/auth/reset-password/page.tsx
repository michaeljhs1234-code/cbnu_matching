'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, CheckCircle, Loader2, XCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@chungbuk.ac.kr')) {
      setErrorMsg('충북대학교 이메일(@chungbuk.ac.kr)만 사용 가능합니다.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/verify`,
    });

    if (error) {
      setErrorMsg('비밀번호 재설정 메일 발송에 실패했습니다.');
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up">
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold">CB</span>
          </div>
          <span className="text-2xl font-bold text-primary">충북match</span>
        </Link>
        <p className="text-text-secondary mt-2 text-sm">비밀번호 재설정</p>
      </div>

      <div className="bg-card rounded-2xl shadow-card p-8 border border-border">
        {status === 'success' ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text mb-2">메일을 확인해 주세요</h2>
            <p className="text-sm text-text-secondary mb-6">
              비밀번호 재설정 링크가 발송되었습니다.
            </p>
            <Link href="/login" className="text-primary font-medium hover:underline text-sm">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {status === 'error' && (
              <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">학교 이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="email"
                  placeholder="userid@chungbuk.ac.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              재설정 링크 발송
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted mt-6">
        <Link href="/login" className="text-primary font-medium hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
