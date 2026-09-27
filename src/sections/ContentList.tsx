import { useState } from 'react';
import {
  BookOpen,
  FileText,
  Feather,
  Calendar,
  Tag,
  Eye,
  Edit3,
  Download,
  Trash2,
  Globe,
  Lock,
  Search,
  Filter,
  Book,
  Copy,
  Check,
  FolderInput,
  Inbox,
  Folder as FolderIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FolderSidebar, UNFILED_FOLDER_ID } from '@/sections/FolderSidebar';
import type { Content, Folder } from '@/types';
import { copyContentToClipboard } from '@/lib/utils';

interface ContentListProps {
  contents: Content[];
  folders: Folder[];
  onView: (content: Content) => void;
  onEdit: (content: Content) => void;
  onDelete: (id: string) => void;
  onExport: (content: Content) => void;
  onTogglePublish: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveContent: (id: string, folderId: string | null) => void;
}

export function ContentList({
  contents,
  folders,
  onView,
  onEdit,
  onDelete,
  onExport,
  onTogglePublish,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveContent
}: ContentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [publishFilter, setPublishFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(false);

  const getTypeIcon = (type: Content['type']) => {
    switch (type) {
      case 'story':
        return <BookOpen className="w-4 h-4" />;
      case 'article':
        return <FileText className="w-4 h-4" />;
      case 'poem':
        return <Feather className="w-4 h-4" />;
      case 'novel':
        return <Book className="w-4 h-4" />;
    }
  };

  // Helper function to strip HTML tags for preview
  const stripHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
  };

  const handleCopy = async (content: Content) => {
    const success = await copyContentToClipboard(content.content);
    if (success) {
      setCopiedId(content.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getTypeLabel = (type: Content['type']) => {
    switch (type) {
      case 'story':
        return 'قصة';
      case 'article':
        return 'مقال';
      case 'poem':
        return 'قصيدة';
      case 'novel':
        return 'رواية';
    }
  };

  const filteredAndSorted = contents
    .filter(content => {
      const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'all' || content.type === typeFilter;

      const matchesPublish = publishFilter === 'all' ||
        (publishFilter === 'published' && content.isPublished) ||
        (publishFilter === 'draft' && !content.isPublished);

      const matchesFolder = selectedFolderId === null ||
        (selectedFolderId === UNFILED_FOLDER_ID ? !content.folderId : content.folderId === selectedFolderId);

      return matchesSearch && matchesType && matchesPublish && matchesFolder;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'title':
          return a.title.localeCompare(b.title, 'ar');
        default:
          return 0;
      }
    });

  const countByFolder = folders.reduce<Record<string, number>>((acc, folder) => {
    acc[folder.id] = contents.filter(c => c.folderId === folder.id).length;
    return acc;
  }, {});
  const countUnfiled = contents.filter(c => !c.folderId).length;
  const countAll = contents.length;

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setFoldersOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="hidden lg:block lg:w-64 shrink-0">
        <Card className="p-3">
          <FolderSidebar
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            countAll={countAll}
            countUnfiled={countUnfiled}
            countByFolder={countByFolder}
          />
        </Card>
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setFoldersOpen(true)}
        >
          <span className="flex items-center gap-2">
            <FolderIcon className="w-4 h-4" />
            المجلدات
          </span>
          <span className="text-xs text-muted-foreground">{folders.length}</span>
        </Button>
        <Sheet open={foldersOpen} onOpenChange={setFoldersOpen}>
          <SheetContent side="right" className="w-[calc(100vw-1.5rem)] max-w-sm gap-0 overflow-y-auto p-0">
            <SheetHeader className="border-b px-5 py-4 text-right">
              <SheetTitle>المجلدات</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <FolderSidebar
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={handleSelectFolder}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                countAll={countAll}
                countUnfiled={countUnfiled}
                countByFolder={countByFolder}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في العناوين أو المحتوى أو الوسوم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="min-w-[6.5rem] flex-1 sm:w-[140px] sm:flex-none">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="نوع المحتوى" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="story">قصص</SelectItem>
              <SelectItem value="article">مقالات</SelectItem>
              <SelectItem value="poem">قصائد</SelectItem>
              <SelectItem value="novel">روايات</SelectItem>
            </SelectContent>
          </Select>

          <Select value={publishFilter} onValueChange={(value) => setPublishFilter(value as any)}>
            <SelectTrigger className="min-w-[6.5rem] flex-1 sm:w-[120px] sm:flex-none">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="published">منشور</SelectItem>
              <SelectItem value="draft">مخفي</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="min-w-[6.5rem] flex-1 sm:w-[140px] sm:flex-none">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="oldest">الأقدم</SelectItem>
              <SelectItem value="title">العنوان</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {contents.length === 0 ? 'لا يوجد محتوى بعد' : 'لم يتم العثور على محتوى'}
          </h3>
          <p className="text-muted-foreground">
            {contents.length === 0
              ? 'ابدأ رحلتك الإبداعية واكتب أول محتوى لك'
              : 'جرب تغيير معايير البحث'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSorted.map((content) => (
            <Card key={content.id} className="card-hover overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      {getTypeIcon(content.type)}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {getTypeLabel(content.type)}
                    </span>
                  </div>
                  <button
                    onClick={() => onTogglePublish(content.id)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                    title={content.isPublished ? 'إخفاء' : 'نشر'}
                  >
                    {content.isPublished ?
                      <Globe className="w-4 h-4 text-green-600" /> :
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                </div>

                <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                  {content.title}
                </h3>

                {content.folderId && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <FolderIcon className="w-3 h-3" />
                    {folders.find(f => f.id === content.folderId)?.name}
                  </div>
                )}

                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                  {stripHtml(content.content).slice(0, 150)}...
                </p>

                {content.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {content.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                    {content.tags.length > 3 && (
                      <span className="px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground">
                        +{content.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {content.createdAt.toLocaleDateString('ar-SA')}
                  </div>

                  <div className="flex items-center gap-0 sm:gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(content)}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      title="عرض"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(content)}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      title="نسخ"
                    >
                      {copiedId === content.id ? (
                        <Check className="w-4 h-4 text-green-600 animate-scale-in" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(content)}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      title="تعديل"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onExport(content)}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      title="تصدير"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="نقل إلى مجلد"
                          className="h-8 w-8 sm:h-9 sm:w-9"
                        >
                          <FolderInput className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onMoveContent(content.id, null)}>
                          <Inbox className="w-4 h-4 ml-2" />
                          بدون مجلد
                        </DropdownMenuItem>
                        {folders.map(folder => (
                          <DropdownMenuItem
                            key={folder.id}
                            disabled={content.folderId === folder.id}
                            onClick={() => onMoveContent(content.id, folder.id)}
                          >
                            <FolderIcon className="w-4 h-4 ml-2" />
                            {folder.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(content.id)}
                      title="حذف"
                      className="h-8 w-8 text-destructive hover:text-destructive sm:h-9 sm:w-9"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

