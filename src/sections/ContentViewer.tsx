import {
  BookOpen,
  FileText,
  Feather,
  Calendar,
  Tag,
  Edit3,
  Download,
  Globe,
  Lock,
  ChevronLeft,
  Book,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Content } from '@/types';

interface ContentViewerProps {
  content: Content;
  onClose: () => void;
  onEdit: (content: Content) => void;
  onExport: (content: Content, format: 'txt' | 'rtf') => void;
}

export function ContentViewer({ content, onClose, onEdit, onExport }: ContentViewerProps) {
  const getTypeIcon = (type: Content['type']) => {
    switch (type) {
      case 'story':
        return <BookOpen className="w-5 h-5" />;
      case 'article':
        return <FileText className="w-5 h-5" />;
      case 'poem':
        return <Feather className="w-5 h-5" />;
      case 'novel':
        return <Book className="w-5 h-5" />;
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          العودة
        </Button>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                تصدير
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport(content, 'txt')}>
                <FileText className="w-4 h-4 ml-2" />
                نص عادي (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(content, 'rtf')}>
                <FileText className="w-4 h-4 ml-2" />
                مستند Word (.rtf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => onEdit(content)}
            className="flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            تعديل
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Meta Info */}
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="flex items-start justify-between mb-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              {getTypeIcon(content.type)}
              {getTypeLabel(content.type)}
            </Badge>
            <div className="flex items-center gap-2 text-sm">
              {content.isPublished ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Globe className="w-4 h-4" />
                  <span>منشور</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>مسودة</span>
                </div>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4 leading-relaxed">
            {content.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(content.createdAt)}</span>
            </div>
            {content.updatedAt.getTime() !== content.createdAt.getTime() && (
              <div className="flex items-center gap-2">
                <span>•</span>
                <span>آخر تعديل: {formatDate(content.updatedAt)}</span>
              </div>
            )}
          </div>

          {content.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Tag className="w-4 h-4 text-muted-foreground" />
              {content.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div
            className="rich-content prose prose-lg max-w-none"
            style={{
              fontFamily: 'Amiri, "Noto Naskh Arabic", serif',
              lineHeight: '2.2'
            }}
            dangerouslySetInnerHTML={{ __html: content.content }}
          />
        </div>
      </Card>
    </div>
  );
}
