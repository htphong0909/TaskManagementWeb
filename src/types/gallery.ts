export interface BoardImage {
  id: string;
  board_id: string;
  name: string;
  url: string;
  file_id?: string | null;
  mime_type?: string | null;
  size?: number | null;
  created_at: string;
}

export interface UploadingItem {
  id: string;
  name: string;
  progress: number;
}
