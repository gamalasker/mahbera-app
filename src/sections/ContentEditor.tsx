import { useState, useEffect } from 'react';
import {
  Save,
  X,
  BookOpen,
  FileText,
  Feather,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import type { Content, ContentFormData } from '@/types';

interface ContentEditorProps {
  content?: Content | null;
  onSave: (data: ContentFormData) => void;
  onCancel: () => void;
}

export function ContentEditor({ content, onSave, onCancel }: ContentEditorProps) {
  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    content: '',
    type: 'story',
    tags: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (content) {
      setFormData({
        title: content.title,
        content: content.content,
        type: content.type,
        tags: content.tags.join(', ')
      });
    } else {
      setFormData({
        title: '',
        content: '',
        type: 'story',
        tags: ''
      });
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('الرجاء إدخال عنوان');
      return;
    }

    if (!formData.content.trim()) {
      alert('الرجاء إدخال المحتوى');
      return;
    }

    setIsSaving(true);

    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 300));

    onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {content ? 'تعديل المحتوى' : 'محتوى جديد'}
          </h2>
          <p className="text-muted-foreground">
            {content ? 'قم بتحديث محتواك الحالي' : 'ابدأ رحلتك الإبداعية'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 min-w-[120px]"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جارٍ الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {content ? 'تحديث' : 'حفظ'}
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                العنوان
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="أدخل عنوان محتواك"
                className="text-lg"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-2">
                نوع المحتوى
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    قصة
                  </SelectItem>
                  <SelectItem value="article" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    مقال
                  </SelectItem>
                  <SelectItem value="poem" className="flex items-center gap-2">
                    <Feather className="w-4 h-4" />
                    قصيدة
                  </SelectItem>
                  <SelectItem value="novel" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    رواية
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2 mt-6">
            <Label htmlFor="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              الوسوم
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="أدخل الوسوم مفصولة بفواصل: وسم1, وسم2, وسم3"
            />
          </div>
        </Card>

        {/* Content */}
        <Card className="p-6">
          <div className="space-y-2 mb-4">
            <Label htmlFor="content" className="flex items-center gap-2">
              المحتوى
              <span className="text-destructive">*</span>
            </Label>
          </div>
          <RichTextEditor
            value={formData.content}
            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
            placeholder="ابدأ الكتابة هنا..."
          />
        </Card>

        {/* Note */}
        <div className="text-sm text-muted-foreground">
          الحقول المعلمة بـ <span className="text-destructive">*</span> إلزامية
        </div>
      </form>
    </div>
  );
}
