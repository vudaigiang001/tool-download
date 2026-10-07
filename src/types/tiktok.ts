export interface TikTokVideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  is_downloaded: boolean;
}

export interface TikTokChannelResponse {
  channel_name: string;
  videos: TikTokVideoItem[];
  error?: string;
}