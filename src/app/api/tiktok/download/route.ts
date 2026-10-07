import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { url, id } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Thiếu đường dẫn TikTok URL' }, { status: 400 });
    }

    // 1. Gọi TikWM API để lấy đường dẫn MP4 trực tiếp của TikTok
    const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const tikwmData = await tikwmRes.json();

    if (tikwmData.code !== 0 || !tikwmData.data) {
      throw new Error(tikwmData.msg || 'Không lấy được thông tin video TikTok');
    }

    // Ưu tiên link HD không watermark, nếu không có lấy link play thường
    const videoUrl = tikwmData.data.hdplay || tikwmData.data.play;
    const title = tikwmData.data.title || `tiktok_${id}`;

    // Làm sạch tên file để tránh lỗi ký tự đặc biệt
    const cleanTitle = title.replace(/[/\\?%*:|"<>]/g, '').substring(0, 50);

    // 2. Tải trực tiếp luồng MP4 về thư mục downloads
    const downloadDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const filePath = path.join(downloadDir, `${cleanTitle}_[${id}].mp4`);

    const videoStreamRes = await fetch(videoUrl);
    if (!videoStreamRes.ok) {
      throw new Error('Lỗi khi tải file video MP4 từ máy chủ TikTok');
    }

    const arrayBuffer = await videoStreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      message: 'Tải video TikTok MP4 thành công!',
    });
  } catch (error: any) {
    console.error('Lỗi khi tải TikTok:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể tải video TikTok.' },
      { status: 500 }
    );
  }
}