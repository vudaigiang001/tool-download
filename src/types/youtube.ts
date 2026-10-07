export interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number; // Thời lượng tính bằng giây
  upload_date: string;
  is_downloaded?: boolean;
  is_short?: boolean; // Phân biệt Short hay Video dài
}

export interface ChannelResponse {
  channel_name: string;
  videos: VideoItem[];
}