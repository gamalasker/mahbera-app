import { Pen, BookOpen, FileText, Feather, Upload, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRef } from 'react';
import { ModeToggle } from '@/components/mode-toggle';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden w-10 h-10 rounded-xl bg-primary sm:flex items-center justify-center">
              <Feather className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-primary">مَحبرة</h1>
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
          <div className="flex items-center gap-1 sm:gap-2">
            <ModeToggle />
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
              title="استيراد"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">استيراد</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={contentCount === 0}
                  className="hidden sm:flex items-center gap-2"
                  title="تصدير الكل"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">تصدير الكل</span>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                  title="خيارات الملفات"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImportClick}>
                  <Upload className="w-4 h-4 ml-2" />
                  استيراد
                </DropdownMenuItem>
                <DropdownMenuItem disabled={contentCount === 0} onClick={() => onExportAll('txt')}>
                  <FileText className="w-4 h-4 ml-2" />
                  تصدير نص عادي
                </DropdownMenuItem>
                <DropdownMenuItem disabled={contentCount === 0} onClick={() => onExportAll('rtf')}>
                  <FileText className="w-4 h-4 ml-2" />
                  تصدير Word
                </DropdownMenuItem>
                <DropdownMenuItem disabled={contentCount === 0} onClick={() => onExportAll('rtf-separate')}>
                  <FileText className="w-4 h-4 ml-2" />
                  تصدير ملفات Word منفصلة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Access Controls */}
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default" size="sm" className="items-center gap-2 px-2 sm:px-3">
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                  <span className="sm:hidden">دخول</span>
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                  appearance={{
                      elements: {
                          avatarBox: "w-8 h-8",
                      },
                  }}    
              />
            </SignedIn>

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

