export type Platform = 'youtube' | 'tiktok' | 'facebook' | 'direct';

export interface MediaItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  is_downloaded: boolean;
  is_short?: boolean;
  extractor?: string;
}