import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface FBVideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  is_downloaded: boolean;
}

export async function POST(request: Request) {
  try {
    const txtPath = path.join(process.cwd(), 'facebook_links.txt');

    // Kiểm tra xem file facebook_links.txt có tồn tại không
    if (!fs.existsSync(txtPath)) {
      return NextResponse.json(
        { error: 'Không tìm thấy file facebook_links.txt ở thư mục gốc dự án. Vui lòng tạo file và dán danh sách link vào.' },
        { status: 404 }
      );
    }

    // Đọc nội dung file txt
    const fileContent = fs.readFileSync(txtPath, 'utf-8');
    const links = fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    if (links.length === 0) {
      return NextResponse.json(
        { error: 'File facebook_links.txt đang trống. Vui lòng thêm các đường dẫn Facebook vào file.' },
        { status: 400 }
      );
    }

    const downloadDir = path.join(process.cwd(), 'downloads');
    const existingFiles = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];

    const videoList: FBVideoItem[] = [];

    // Duyệt qua từng link trong file txt
    for (let i = 0; i < links.length; i++) {
      const targetUrl = links[i];
      
      // Tạo ID an toàn từ URL
      const matchId = targetUrl.match(/(?:reel|videos|watch\?v=|\/v\/|\/posts\/)\/?(\d+)/i);
      const videoId = matchId ? matchId[1] : `fb_custom_${i + 1}`;

      const isDownloaded = existingFiles.some((file) => file.includes(videoId));

      // Lấy thông tin nhanh của link bằng yt-dlp
      try {
        const command = `yt-dlp --skip-download -J "${targetUrl}"`;
        const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 50 });
        const fbData = JSON.parse(stdout);

        let thumbUrl = fbData.thumbnail || '';
        if (!thumbUrl && fbData.thumbnails && fbData.thumbnails.length > 0) {
          thumbUrl = fbData.thumbnails[fbData.thumbnails.length - 1].url;
        }

        videoList.push({
          id: videoId,
          title: fbData.title || fbData.description || `Facebook Reel #${i + 1}`,
          url: targetUrl,
          thumbnail: thumbUrl,
          duration: fbData.duration || 0,
          is_downloaded: isDownloaded,
        });
      } catch (err) {
        // Fallback nếu link không lấy được metadata chi tiết
        videoList.push({
          id: videoId,
          title: `Facebook Video/Reel #${i + 1}`,
          url: targetUrl,
          thumbnail: '',
          duration: 0,
          is_downloaded: isDownloaded,
        });
      }
    }

    return NextResponse.json({
      channel_name: `Danh sách từ file facebook_links.txt (${links.length} link)`,
      videos: videoList,
    });
  } catch (error: any) {
    console.error('Lỗi khi đọc danh sách Facebook:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi xử lý danh sách Facebook.' },
      { status: 500 }
    );
  }
}