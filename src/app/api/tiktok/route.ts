import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface TikTokItemData {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  is_downloaded: boolean;
}

export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json();

    if (!channelUrl) {
      return NextResponse.json({ error: 'Vui lòng cung cấp link kênh TikTok' }, { status: 400 });
    }

    const downloadDir = path.join(process.cwd(), 'downloads');
    const existingFiles = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];

    // Chuẩn hóa link TikTok channel
    let targetUrl = channelUrl.trim();
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://www.tiktok.com/${targetUrl.startsWith('@') ? targetUrl : '@' + targetUrl}`;
    }

    // Quét danh sách bài đăng từ kênh TikTok bằng yt-dlp
    const command = `yt-dlp --flat-playlist -J "${targetUrl}"`;
    const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
    const tiktokData = JSON.parse(stdout);

    const entries = tiktokData.entries || [];
    const seenIds = new Set<string>();
    const videoList: TikTokItemData[] = [];

    for (const entry of entries) {
      if (!entry || !entry.id) continue;

      if (!seenIds.has(entry.id)) {
        seenIds.add(entry.id);

        const videoId = entry.id;
        const duration = entry.duration || 0;

        // Bóc tách URL Thumbnail chuẩn từ dữ liệu yt-dlp
        let thumbUrl = entry.thumbnail || '';
        if (!thumbUrl && entry.thumbnails && entry.thumbnails.length > 0) {
          thumbUrl = entry.thumbnails[entry.thumbnails.length - 1].url || entry.thumbnails[0].url || '';
        }

        videoList.push({
          id: videoId,
          title: entry.title || entry.description || 'Video TikTok',
          url: entry.url || `https://www.tiktok.com/@user/video/${videoId}`,
          thumbnail: thumbUrl,
          duration: duration,
          is_downloaded: existingFiles.some((file) => file.includes(videoId)),
        });
      }
    }

    return NextResponse.json({
      channel_name: tiktokData.title || tiktokData.uploader || 'Kênh TikTok',
      videos: videoList,
    });
  } catch (error: any) {
    console.error('Lỗi khi quét kênh TikTok:', error);
    return NextResponse.json(
      { error: 'Không thể lấy thông tin kênh TikTok. Vui lòng kiểm tra lại URL.' },
      { status: 500 }
    );
  }
}