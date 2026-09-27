export interface Content {
  id: string;
  title: string;
  content: string;
  type: 'story' | 'article' | 'poem' | 'novel';
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isPublished: boolean;
  isDeleted?: boolean;
  folderId?: string | null;
}

export interface ContentFormData {
  title: string;
  content: string;
  type: 'story' | 'article' | 'poem' | 'novel';
  tags: string;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ViewMode = 'list' | 'grid' | 'editor' | 'view';
