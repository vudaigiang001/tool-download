import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đường dẫn video.' },
        { status: 400 }
      );
    }

    const targetUrl = url.trim();

    // Lấy danh sách các file đã tải về trong thư mục downloads để kiểm tra
    const downloadDir = path.join(process.cwd(), 'downloads');
    const existingFiles = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];

    // Lấy thông tin video từ yt-dlp
    const command = `yt-dlp --skip-download -J "${targetUrl}"`;
    const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 50 });
    const videoData = JSON.parse(stdout);

    const videoId = videoData.id || `custom_${Date.now()}`;
    const isDownloaded = existingFiles.some((file) => file.includes(videoId));

    let thumbUrl = videoData.thumbnail || '';
    if (!thumbUrl && videoData.thumbnails && videoData.thumbnails.length > 0) {
      thumbUrl = videoData.thumbnails[videoData.thumbnails.length - 1].url;
    }

    const videoItem = {
      id: videoId,
      title: videoData.title || videoData.description || 'Video Tải Trực Tiếp',
      url: targetUrl,
      thumbnail: thumbUrl,
      duration: videoData.duration || 0,
      is_downloaded: isDownloaded,
      extractor: videoData.extractor_key || 'Direct',
    };

    return NextResponse.json({
      video: videoItem,
    });
  } catch (error: any) {
    console.error('Lỗi khi lấy thông tin link trực tiếp:', error);
    return NextResponse.json(
      { error: 'Không thể lấy thông tin video từ link này. Vui lòng kiểm tra lại đường dẫn.' },
      { status: 500 }
    );
  }
}