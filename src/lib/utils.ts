import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from 'sonner'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripHtml(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return (tempDiv.textContent || tempDiv.innerText || '').trim();
}

export async function copyContentToClipboard(htmlContent: string): Promise<boolean> {
  const plainText = stripHtml(htmlContent);
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
    } else {
      await navigator.clipboard.writeText(plainText);
    }
    toast.success('تم نسخ المحتوى بنجاح');
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    try {
      await navigator.clipboard.writeText(plainText);
      toast.success('تم نسخ المحتوى كـ نص عادي');
      return true;
    } catch (fallbackErr) {
      toast.error('فشل في نسخ المحتوى');
      return false;
    }
  }
}

