import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ─── Apps Script code the user must paste ────────────────────────────────────
const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var contents = e.postData.contents;
    var fileName = 'mahbera_data.json';
    var files = DriveApp.getFilesByName(fileName);
    if (files.hasNext()) {
      files.next().setContent(contents);
    } else {
      DriveApp.createFile(fileName, contents, MimeType.PLAIN_TEXT);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  try {
    var fileName = 'mahbera_data.json';
    var files = DriveApp.getFilesByName(fileName);
    if (files.hasNext()) {
      var content = files.next().getBlob().getDataAsString();
      return ContentService
        .createTextOutput(content)
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput('[]')
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput('[]')
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => void;
}

export function DriveSetupDialog({ open, onOpenChange, onConnect }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = () => {
    onConnect();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">ربط مَحبرة بجوجل درايف</DialogTitle>
          <DialogDescription>
            سيتم حفظ كل محتوياتك تلقائياً في ملف <code className="bg-muted px-1 rounded text-xs">mahbera_data.json</code> داخل جوجل درايف.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">

          {/* Step 1 */}
          <div className="space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">١</span>
              افتح Google Apps Script
            </p>
            <a
              href="https://script.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 mr-8"
            >
              script.google.com
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">٢</span>
              أنشئ مشروعاً جديداً وانسخ الكود التالي
            </p>
            <div className="mr-8 relative">
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto font-mono leading-relaxed border border-border text-left" dir="ltr">
                {APPS_SCRIPT_CODE}
              </pre>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="absolute top-2 left-2 h-7 gap-1 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </Button>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">٣</span>
              انشر كتطبيق ويب
            </p>
            <ul className="mr-8 space-y-1 text-sm text-muted-foreground list-none">
              <li>• من القائمة: <strong>نشر ← نشر جديد</strong></li>
              <li>• النوع: <strong>تطبيق ويب</strong></li>
              <li>• تنفيذ بوصفك: <strong>أنا</strong></li>
              <li>• من يملك الوصول: <strong>الجميع (Anyone)</strong></li>
            </ul>
          </div>

          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mr-8 mb-2">
            <strong>ملاحظة:</strong> يجب اختيار "الجميع" ليعمل على جميع الأجهزة مباشرة.
          </div>

          {/* Connect button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button onClick={handleConnect}>
              اتصال ومزامنة 
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
