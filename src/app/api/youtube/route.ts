import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface VideoItemData {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  upload_date: string;
  is_downloaded: boolean;
  is_short: boolean;
}

export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json();

    if (!channelUrl) {
      return NextResponse.json({ error: 'Vui lòng cung cấp link kênh YouTube' }, { status: 400 });
    }

    const downloadDir = path.join(process.cwd(), 'downloads');
    const existingFiles = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];

    // Chuẩn hóa URL gốc của kênh
    let baseUrl = channelUrl.trim().replace(/\/$/, '');
    baseUrl = baseUrl.replace(/\/(videos|shorts|featured|streams|playlists)$/, '');

    // Hàm quét danh sách từ 1 tab của kênh
    const fetchTab = async (tabPath: string, isShortTab: boolean) => {
      try {
        const command = `yt-dlp --flat-playlist -J "${baseUrl}/${tabPath}"`;
        const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
        const data = JSON.parse(stdout);
        return { data, isShortTab };
      } catch (e) {
        return { data: null, isShortTab };
      }
    };

    // Chạy song song quét cả Tab Videos và Shorts cùng lúc
    const [videosResult, shortsResult] = await Promise.all([
      fetchTab('videos', false),
      fetchTab('shorts', true),
    ]);

    const seenIds = new Set<string>();
    const videoList: VideoItemData[] = [];
    let channelName = 'Kênh YouTube';

    const processEntries = (result: { data: any; isShortTab: boolean }) => {
      if (!result.data) return;

      if (result.data.title || result.data.uploader) {
        channelName = result.data.title || result.data.uploader;
      }

      const entries = result.data.entries || [];
      for (const entry of entries) {
        if (!entry || !entry.id || entry.id.startsWith('UC')) continue;

        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id);

          const videoId = entry.id;
          const duration = entry.duration || 0;
          const isShort = result.isShortTab || entry.url?.includes('/shorts/') || (duration > 0 && duration <= 60);

          videoList.push({
            id: videoId,
            title: entry.title || 'Video YouTube',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: duration,
            upload_date: '',
            is_downloaded: existingFiles.some((file) => file.includes(videoId)),
            is_short: isShort,
          });
        }
      }
    };

    // Đưa dữ liệu quét từ 2 tab vào mảng danh sách video
    processEntries(videosResult);
    processEntries(shortsResult);

    return NextResponse.json({
      channel_name: channelName,
      videos: videoList,
    });
  } catch (error: any) {
    console.error('Lỗi khi quét kênh:', error);
    return NextResponse.json(
      { error: 'Không thể lấy thông tin kênh. Vui lòng kiểm tra lại đường dẫn.' },
      { status: 500 }
    );
  }
}