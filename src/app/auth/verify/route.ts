import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/match';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 인증 완료 후 프로필 생성 확인
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          // 프로필이 없으면 생성
          const meta = user.user_metadata;
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email!,
            nickname: meta.nickname || '',
            full_name: meta.full_name || '',
            student_id: meta.student_id || '',
            department: meta.department || '',
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 에러 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
