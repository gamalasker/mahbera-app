import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from '@/sections/Header';
import { ContentList } from '@/sections/ContentList';
import { ContentEditor } from '@/sections/ContentEditor';
import { ContentViewer } from '@/sections/ContentViewer';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import type { Content, ContentFormData, ViewMode } from '@/types';
import './App.css';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const {
    contents,
    isLoaded,
    addContent,
    updateContent,
    deleteContent,
    togglePublish,
    getContent,
    replaceContents,
    exportToText,
    exportAllToText,
    exportToRtf,
    exportAllToRtf,
    exportAllSeparately,
    importFromFile
  } = useLocalStorage();

  const {
    status: driveStatus,
    lastSynced: driveLastSynced,
    error: driveError,
    scriptUrl: driveScriptUrl,
    connect: driveConnect,
    disconnect: driveDisconnect,
    scheduleSyncToDrive,
  } = useGoogleDrive(replaceContents);

  // Auto-sync to Drive whenever contents change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      scheduleSyncToDrive(contents);
    }
  }, [contents, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also sync immediately when Drive first connects (uploads local data if Drive was empty)
  const prevDriveStatus = useRef(driveStatus);
  useEffect(() => {
    if (prevDriveStatus.current !== 'connected' && driveStatus === 'connected' && contents.length > 0) {
      scheduleSyncToDrive(contents);
    }
    prevDriveStatus.current = driveStatus;
  }, [driveStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show Drive error as toast
  useEffect(() => {
    if (driveError) toast.error(driveError);
  }, [driveError]);

  const handleNewContent = () => {
    setSelectedContent(null);
    setViewMode('editor');
  };

  const handleSaveContent = (formData: ContentFormData) => {
    if (selectedContent) {
      updateContent(selectedContent.id, formData);
      toast.success('تم تحديث المحتوى بنجاح');
    } else {
      const newContent = addContent(formData);
      toast.success('تم إضافة المحتوى بنجاح');
      setSelectedContent(newContent);
    }
    setViewMode('view');
  };

  const handleViewContent = (content: Content) => {
    setSelectedContent(content);
    setViewMode('view');
  };

  const handleEditContent = (content: Content) => {
    setSelectedContent(content);
    setViewMode('editor');
  };

  const handleDeleteContent = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
      deleteContent(id);
      toast.error('تم حذف المحتوى');
      if (selectedContent?.id === id) {
        setViewMode('list');
        setSelectedContent(null);
      }
    }
  };

  const handleExportContent = (content: Content, format: 'txt' | 'rtf' = 'txt') => {
    if (format === 'rtf') {
      exportToRtf(content);
    } else {
      exportToText(content);
    }
    toast.success('تم تصدير المحتوى بنجاح');
  };

  const handleExportAll = async (format: 'txt' | 'rtf' | 'rtf-separate' = 'txt') => {
    if (contents.length === 0) {
      toast.error('لا يوجد محتوى للتصدير');
      return;
    }

    if (format === 'rtf-separate') {
      try {
        const count = await exportAllSeparately();
        if (count && count > 0) {
          toast.success(`تم تصدير ${count} ملف بنجاح`);
        }
      } catch (error) {
        // Error handling is done inside exportAllSeparately or cancelled by user
      }
    } else if (format === 'rtf') {
      exportAllToRtf();
      toast.success(`تم تصدير ${contents.length} محتوى بنجاح`);
    } else {
      exportAllToText();
      toast.success(`تم تصدير ${contents.length} محتوى بنجاح`);
    }
  };

  const handleTogglePublish = (id: string) => {
    togglePublish(id);
    const content = getContent(id);
    if (content) {
      toast.success(content.isPublished ? 'تم إخفاء المحتوى' : 'تم نشر المحتوى');
    }
  };

  const handleImport = async (file: File) => {
    try {
      await importFromFile(file);
      toast.success('تم استيراد المحتوى بنجاح');
    } catch {
      toast.error('فشل في استيراد الملف');
    }
  };

  const handleCancelEdit = () => {
    setViewMode('list');
    setSelectedContent(null);
  };

  const handleCloseViewer = () => {
    setViewMode('list');
    setSelectedContent(null);
  };

  // Render current view
  const renderContent = () => {
    if (!isLoaded) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      );
    }

    switch (viewMode) {
      case 'editor':
        return (
          <ContentEditor
            content={selectedContent}
            onSave={handleSaveContent}
            onCancel={handleCancelEdit}
          />
        );

      case 'view':
        if (!selectedContent) {
          setViewMode('list');
          return null;
        }
        return (
          <ContentViewer
            content={selectedContent}
            onClose={handleCloseViewer}
            onEdit={handleEditContent}
            onExport={handleExportContent}
          />
        );

      case 'list':
      default:
        return (
          <ContentList
            contents={contents}
            onView={handleViewContent}
            onEdit={handleEditContent}
            onDelete={handleDeleteContent}
            onExport={handleExportContent}
            onTogglePublish={handleTogglePublish}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onNewContent={handleNewContent}
        onExportAll={handleExportAll}
        onImport={handleImport}
        contentCount={contents.length}
        driveStatus={driveStatus}
        driveLastSynced={driveLastSynced}
        driveScriptUrl={driveScriptUrl}
        onDriveConnect={driveConnect}
        onDriveDisconnect={driveDisconnect}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            fontFamily: 'Noto Naskh Arabic, Amiri, serif'
          }
        }}
      />
    </div>
  );
}

export default App;
