'use client';

import { useState } from 'react';
import { Platform, MediaItem } from '@/src/types/media';

export default function Home() {
  const [platform, setPlatform] = useState<Platform>('direct');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());
  const [channelName, setChannelName] = useState('');
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<'video' | 'short'>('video');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Trạng thái cho tính năng TẢI HÀNG LOẠT
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  // Xử lý lấy thông tin / nạp danh sách video
  const handleAction = async () => {
    if (platform !== 'facebook' && !url.trim()) {
      setError('Vui lòng nhập đường dẫn');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setVideos([]);
    setChannelName('');

    try {
      if (platform === 'facebook') {
        const res = await fetch('/api/facebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể đọc file facebook_links.txt');

        setChannelName(`Facebook từ file TXT (${data.videos.length} video)`);
        setVideos(data.videos);

        const alreadyDownloaded = new Set<string>(
          data.videos.filter((v: MediaItem) => v.is_downloaded).map((v: MediaItem) => v.id)
        );
        setDownloadedSet(alreadyDownloaded);
      } else if (platform === 'direct') {
        const res = await fetch('/api/direct-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể lấy thông tin video');

        const singleVideo: MediaItem = data.video;
        setChannelName(`Video từ link trực tiếp (${singleVideo.extractor || 'Link'})`);
        setVideos([singleVideo]);

        if (singleVideo.is_downloaded) {
          setDownloadedSet(new Set([singleVideo.id]));
        }
      } else {
        const apiEndpoint = `/api/${platform}`;
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelUrl: url }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra khi lấy dữ liệu');

        setChannelName(data.channel_name);
        const fetchedVideos: MediaItem[] = data.videos || [];
        setVideos(fetchedVideos);

        const alreadyDownloaded = new Set<string>(
          fetchedVideos.filter((v) => v.is_downloaded).map((v) => v.id)
        );
        setDownloadedSet(alreadyDownloaded);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  // Hàm tải 1 video đơn lẻ (Trả về true/false)
  const handleDownloadSingle = async (video: MediaItem): Promise<boolean> => {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: video.url,
          id: video.id,
          platform: platform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(`Lỗi tải video ${video.id}:`, data.error);
        return false;
      }

      setDownloadedSet((prev) => new Set(prev).add(video.id));
      return true;
    } catch (err) {
      console.error(`Lỗi kết nối khi tải video ${video.id}:`, err);
      return false;
    }
  };

  // Tải 1 video khi click nút đơn lẻ
  const handleDownloadOneClick = async (video: MediaItem) => {
    setDownloadingId(video.id);
    await handleDownloadSingle(video);
    setDownloadingId(null);
  };

  // NÂNG CẤP MỚI: TẢI TẤT CẢ VIDEO TRONG DANH SÁCH HIỂN THỊ
  const handleDownloadAll = async () => {
    // Lọc ra các video chưa được tải về
    const targets = filteredVideos.filter((v) => !downloadedSet.has(v.id));

    if (targets.length === 0) {
      alert('Tất cả video trong danh sách hiện tại đã được tải về!');
      return;
    }

    const confirmDownload = confirm(
      `Xác nhận tải hàng loạt ${targets.length} video chưa tải?`
    );
    if (!confirmDownload) return;

    setIsDownloadingAll(true);
    setDownloadProgress({ current: 0, total: targets.length });

    let completed = 0;

    // Vòng lặp tuần tự từng video để không bị nghẽn mạng / bị chặn IP
    for (const video of targets) {
      setDownloadingId(video.id);
      await handleDownloadSingle(video);
      completed++;
      setDownloadProgress({ current: completed, total: targets.length });
    }

    setDownloadingId(null);
    setIsDownloadingAll(false);
    setSuccessMsg(`Đã hoàn thành tải về ${completed}/${targets.length} video!`);
  };

  const filteredVideos = videos.filter((v) => {
    if (platform !== 'youtube') return true;
    if (filter === 'video') return !v.is_short;
    if (filter === 'short') return v.is_short;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-10 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Media Downloader Pro
          </h1>
          <p className="text-slate-400 text-sm">
            Tải video hàng loạt từ YouTube, TikTok, Facebook (File TXT) & Link Bất Kỳ
          </p>
        </div>

        {/* Tab Nền Tảng */}
        <div className="flex justify-center border-b border-slate-800 pb-3 gap-3 flex-wrap">
          <button
            onClick={() => {
              setPlatform('direct');
              setUrl('');
              setVideos([]);
              setError('');
              setSuccessMsg('');
              setChannelName('');
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              platform === 'direct'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/30 scale-105 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🔗</span> Link Bất Kỳ
          </button>

          <button
            onClick={() => {
              setPlatform('facebook');
              setUrl('');
              setVideos([]);
              setError('');
              setSuccessMsg('');
              setChannelName('');
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              platform === 'facebook'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>📘</span> Facebook (File TXT)
          </button>

          <button
            onClick={() => {
              setPlatform('youtube');
              setUrl('');
              setVideos([]);
              setError('');
              setSuccessMsg('');
              setChannelName('');
              setFilter('video');
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              platform === 'youtube'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>📺</span> YouTube Kênh
          </button>

          <button
            onClick={() => {
              setPlatform('tiktok');
              setUrl('');
              setVideos([]);
              setError('');
              setSuccessMsg('');
              setChannelName('');
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              platform === 'tiktok'
                ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🎵</span> TikTok Kênh
          </button>
        </div>

        {/* Khung Nhập / Lấy Dữ Liệu */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row gap-3">
            {platform !== 'facebook' ? (
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                placeholder={
                  platform === 'direct'
                    ? 'Dán bất kỳ link video nào (YouTube, Facebook Reel, TikTok...)'
                    : platform === 'youtube'
                    ? 'Dán link kênh YouTube (Ví dụ: https://www.youtube.com/@Fireship)'
                    : 'Dán link kênh TikTok (Ví dụ: https://www.tiktok.com/@therock)'
                }
                className="flex-1 px-4 py-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            ) : (
              <div className="flex-1 bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 text-slate-400 text-sm flex items-center justify-between">
                <span>📄 Đọc danh sách từ file <code className="text-blue-400 font-mono">facebook_links.txt</code></span>
              </div>
            )}

            <button
              onClick={handleAction}
              disabled={loading || isDownloadingAll}
              className={`px-8 py-3 font-bold rounded-xl transition-all shadow-lg min-w-[160px] text-sm text-white ${
                platform === 'facebook'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  : platform === 'direct'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 font-extrabold'
                  : platform === 'tiktok'
                  ? 'bg-gradient-to-r from-cyan-500 to-pink-500 hover:opacity-90 shadow-cyan-500/20 text-slate-950 font-black'
                  : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
              } disabled:opacity-50`}
            >
              {loading
                ? 'Đang xử lý...'
                : platform === 'facebook'
                ? 'Đọc File TXT'
                : platform === 'direct'
                ? 'Lấy Video'
                : 'Lấy Dữ Liệu'}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          {successMsg && <p className="text-emerald-400 text-sm font-medium">{successMsg}</p>}
        </div>

        {/* Khung Kết Quả & Nút Tải Tất Cả */}
        {channelName && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  {platform === 'facebook' && <span className="text-blue-500">📘</span>}
                  {platform === 'direct' && <span className="text-emerald-400">🔗</span>}
                  {platform === 'tiktok' && <span className="text-cyan-400">🎵</span>}
                  {channelName}
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Hiển thị {filteredVideos.length} video (Đã tải: {downloadedSet.size}/{filteredVideos.length})
                </p>
              </div>

              {/* NÚT TẢI TẤT CẢ VIDEO */}
              {filteredVideos.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll || downloadingId !== null}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDownloadingAll ? (
                    <>
                      <span className="animate-spin">🌀</span> Đang tải hàng loạt ({downloadProgress.current}/{downloadProgress.total})...
                    </>
                  ) : (
                    <>
                      <span>⚡</span> Tải Tất Cả Video ({filteredVideos.length - downloadedSet.size} chưa tải)
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Grid Thẻ Video */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVideos.map((video) => {
                const isDownloaded = downloadedSet.has(video.id);
                const isDownloading = downloadingId === video.id;

                return (
                  <div
                    key={video.id}
                    className={`bg-slate-900/60 rounded-2xl overflow-hidden border flex flex-col transition-all group duration-300 shadow-md ${
                      isDownloaded
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : isDownloading
                        ? 'border-amber-500/80 bg-amber-950/10'
                        : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Thumbnail & Badge trạng thái */}
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      <img
                        src={video.thumbnail || 'https://placehold.co/600x400/0f172a/3b82f6?text=Video'}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.retried && video.thumbnail) {
                            target.dataset.retried = 'true';
                            target.src = `https://wsrv.nl/?url=${encodeURIComponent(video.thumbnail)}`;
                          } else {
                            target.src = 'https://placehold.co/600x400/0f172a/3b82f6?text=Video';
                          }
                        }}
                      />

                      {/* Trạng thái đính kèm */}
                      {isDownloaded && (
                        <span className="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow backdrop-blur-sm">
                          ✓ ĐÃ TẢI VỀ
                        </span>
                      )}
                      {isDownloading && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow backdrop-blur-sm animate-pulse">
                          ⏳ ĐANG TẢI...
                        </span>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                      <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed">
                        {video.title}
                      </h3>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleDownloadOneClick(video)}
                          disabled={isDownloading || isDownloadingAll}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isDownloaded
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                          } disabled:opacity-50`}
                        >
                          {isDownloading ? (
                            <>
                              <span className="animate-spin">🌀</span> Đang tải...
                            </>
                          ) : isDownloaded ? (
                            <>
                              <span>✓</span> Tải Lại
                            </>
                          ) : (
                            <>
                              <span>⬇</span> Tải Video
                            </>
                          )}
                        </button>

                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-center w-full py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] font-medium transition-all border border-slate-800"
                        >
                          Mở Nguồn Trực Tiếp ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}