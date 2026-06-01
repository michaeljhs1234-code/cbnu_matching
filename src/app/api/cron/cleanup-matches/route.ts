import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // match_datetime이 지난 매치 삭제
    const { data, error } = await supabase
      .from('matches')
      .delete()
      .lt('match_datetime', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('cleanup-matches error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('cleanup-matches exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
