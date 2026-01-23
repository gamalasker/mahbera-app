export interface Content {
  id: string;
  title: string;
  content: string;
  type: 'story' | 'article' | 'poem' | 'novel';
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isPublished: boolean;
}

export interface ContentFormData {
  title: string;
  content: string;
  type: 'story' | 'article' | 'poem' | 'novel';
  tags: string;
}

export type ViewMode = 'list' | 'grid' | 'editor' | 'view';
