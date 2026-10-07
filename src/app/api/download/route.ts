import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';



const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { url, id, platform } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Thiếu đường dẫn URL' }, { status: 400 });
    }

    // Nếu là TikTok hoặc link chứa tiktok.com -> Chuyển sang handler TikTok chuyên dụng
    if (platform === 'tiktok' || url.includes('tiktok.com')) {
      const origin = new URL(request.url).origin;
      const tikRes = await fetch(`${origin}/api/tiktok/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, id }),
      });

      const tikData = await tikRes.json();
      if (!tikRes.ok) {
        throw new Error(tikData.error || 'Lỗi tải video TikTok');
      }

      return NextResponse.json(tikData);
    }

    // Xử lý các nền tảng khác bằng yt-dlp (YouTube, Facebook, Link trực tiếp)
    const downloadDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const outputTemplate = path.join(downloadDir, `%(title)s_[${id}].mp4`);
    const command = `yt-dlp --no-playlist -f "bv*+ba/b[ext=mp4]/best" --merge-output-format mp4 --remux-video mp4 -o "${outputTemplate}" "${url}"`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });

    return NextResponse.json({
      success: true,
      message: 'Tải video thành công dạng MP4!',
    });
  } catch (error: any) {
    console.error('Lỗi khi tải video:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tải video. Vui lòng kiểm tra lại đường dẫn.' },
      { status: 500 }
    );
  }
}