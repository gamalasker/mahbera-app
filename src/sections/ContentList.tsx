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
  Book
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
import type { Content } from '@/types';

interface ContentListProps {
  contents: Content[];
  onView: (content: Content) => void;
  onEdit: (content: Content) => void;
  onDelete: (id: string) => void;
  onExport: (content: Content) => void;
  onTogglePublish: (id: string) => void;
}

export function ContentList({
  contents,
  onView,
  onEdit,
  onDelete,
  onExport,
  onTogglePublish
}: ContentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

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

      return matchesSearch && matchesType;
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

  return (
    <div className="space-y-6">
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

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
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

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-[140px]">
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

                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                  {content.content.slice(0, 150)}...
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

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {content.createdAt.toLocaleDateString('ar-SA')}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(content)}
                      title="عرض"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(content)}
                      title="تعديل"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onExport(content)}
                      title="تصدير"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(content.id)}
                      title="حذف"
                      className="text-destructive hover:text-destructive"
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
  );
}
