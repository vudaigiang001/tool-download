export type Platform = 'youtube' | 'tiktok' | 'facebook';

export interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  is_downloaded: boolean;
  is_short?: boolean;
}

export interface ChannelScanResponse {
  channel_name: string;
  videos: VideoItem[];
  error?: string;
}