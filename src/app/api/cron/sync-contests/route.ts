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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 만료된 외부 공모전 삭제
    const { data: deleted, error: deleteError } = await supabase
      .from('external_contests')
      .delete()
      .lt('deadline', yesterdayStr)
      .select('id');

    if (deleteError) {
      console.error('sync-contests delete error:', deleteError);
    }

    // TODO: 올콘·링커리어·위비티 크롤링 결과를 여기서 INSERT/UPDATE
    // 현재는 만료 삭제만 수행

    return NextResponse.json({
      success: true,
      deleted: deleted?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('sync-contests exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
