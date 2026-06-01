import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 프로필 존재 여부 확인 및 자동 복구 (이메일 인증 스킵 혹은 직접 로그인의 경우 대비)
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        const meta = user.user_metadata;
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email!,
          nickname: meta.nickname || `user_${user.id.substring(0, 8)}`,
          full_name: meta.full_name || '',
          student_id: meta.student_id || '',
          department: meta.department || '',
        });
      }
    } catch {
      // 로컬 빌드 혹은 에러 시 중단 방지
    }
  }

  // 공개 경로 정의
  const publicPaths = ['/', '/login', '/signup', '/auth'];
  const isPublicPath = publicPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith('/auth/')
  );

  // 미인증 사용자가 보호 경로 접근 시 로그인으로 리다이렉트
  if (!user && !isPublicPath && !request.nextUrl.pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 인증 사용자가 로그인/가입 페이지 접근 시 메인으로 리다이렉트
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/match';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
