export interface ReleaseNote {
  id: string;
  title: string;
  module_name: string;
  summary: string;
  content: string;
  created_at: string;
}

export interface UserReadRelease {
  user_id: string;
  release_id: string;
  read_at: string;
}
