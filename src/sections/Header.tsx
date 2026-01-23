import { Pen, BookOpen, FileText, Feather, Upload, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRef } from 'react';

interface HeaderProps {
  onNewContent: () => void;
  onExportAll: (format: 'txt' | 'rtf' | 'rtf-separate') => void;
  onImport: (file: File) => void;
  contentCount: number;
}

export function Header({ onNewContent, onExportAll, onImport, contentCount }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      // Reset input to allow importing the same file again
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Feather className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">مَحبرة</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                منصة المبدعين الأدبية
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>{contentCount} محتوى</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.md,.text"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              className="hidden sm:flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              استيراد
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={contentCount === 0}
                  className="hidden sm:flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  تصدير الكل
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExportAll('txt')}>
                  <FileText className="w-4 h-4 ml-2" />
                  نص عادي (.txt)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportAll('rtf')}>
                  <FileText className="w-4 h-4 ml-2" />
                  مستند Word (.rtf)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportAll('rtf-separate')}>
                  <FileText className="w-4 h-4 ml-2" />
                  ملفات Word منفصلة (.rtf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={onNewContent}
              className="flex items-center gap-2"
            >
              <Pen className="w-4 h-4" />
              <span className="hidden sm:inline">كتابة جديدة</span>
              <span className="sm:hidden">جديد</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

