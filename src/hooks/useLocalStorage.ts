import { useState, useEffect, useCallback } from 'react';
import type { Content, ContentFormData } from '@/types';

const STORAGE_KEY = 'mahbera_contents';

export function useLocalStorage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load contents from localStorage on mount
  useEffect(() => {
    const loadContents = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setContents(parsed.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          })));
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadContents();
  }, []);

  // Save contents to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contents));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [contents, isLoaded]);

  const addContent = useCallback((formData: ContentFormData) => {
    const newContent: Content = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: formData.title,
      content: formData.content,
      type: formData.type,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
      isPublished: false
    };

    setContents(prev => [newContent, ...prev]);
    return newContent;
  }, []);

  const updateContent = useCallback((id: string, formData: ContentFormData) => {
    setContents(prev => prev.map(item =>
      item.id === id
        ? {
          ...item,
          title: formData.title,
          content: formData.content,
          type: formData.type,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
          updatedAt: new Date()
        }
        : item
    ));
  }, []);

  const deleteContent = useCallback((id: string) => {
    setContents(prev => prev.filter(item => item.id !== id));
  }, []);

  const togglePublish = useCallback((id: string) => {
    setContents(prev => prev.map(item =>
      item.id === id
        ? { ...item, isPublished: !item.isPublished, updatedAt: new Date() }
        : item
    ));
  }, []);

  const getContent = useCallback((id: string) => {
    return contents.find(item => item.id === id);
  }, [contents]);

  // Helper function to convert HTML to plain text
  const stripHtml = (html: string): string => {
    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Replace <br> and block elements with newlines
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('p, div, li').forEach(block => {
      block.prepend('\n');
    });

    // Get text content
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
  };

  const exportToText = useCallback(async (content: Content) => {
    const plainContent = stripHtml(content.content);
    const text = `
${content.title}
${'='.repeat(content.title.length)}

النوع: ${content.type === 'story' ? 'قصة' : content.type === 'article' ? 'مقال' : content.type === 'poem' ? 'قصيدة' : 'رواية'}
التاريخ: ${content.createdAt.toLocaleDateString('ar-SA')}
الوسوم: ${content.tags.join(', ') || 'بدون وسوم'}

${'-'.repeat(50)}

${plainContent}

${'-'.repeat(50)}

تم التصدير من تطبيق مَحبرة
    `.trim();

    const suggestedName = `${content.title.replace(/[^\w\u0600-\u06FF]/g, '_')}.txt`;

    // Try to use File System Access API for choosing save location
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        return;
      } catch (err: any) {
        // User cancelled the dialog
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback for browsers that don't support showSaveFilePicker
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportAllToText = useCallback(async () => {
    // Sort contents from oldest to newest
    const sortedContents = [...contents].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const allText = sortedContents.map(content => {
      const plainContent = stripHtml(content.content);
      return `
${content.title}
${'='.repeat(content.title.length)}

النوع: ${content.type === 'story' ? 'قصة' : content.type === 'article' ? 'مقال' : content.type === 'poem' ? 'قصيدة' : 'رواية'}
التاريخ: ${content.createdAt.toLocaleDateString('ar-SA')}
الوسوم: ${content.tags.join(', ') || 'بدون وسوم'}

${'-'.repeat(50)}

${plainContent}
      `.trim();
    }).join('\n\n' + '='.repeat(70) + '\n\n');

    const suggestedName = `محتويات_مَحبرة_${new Date().toLocaleDateString('ar-SA').replace(/\//g, '-')}.txt`;

    // Try to use File System Access API for choosing save location
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(allText);
        await writable.close();
        return;
      } catch (err: any) {
        // User cancelled the dialog
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback for browsers that don't support showSaveFilePicker
    const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [contents]);

  const importFromFile = useCallback((file: File): Promise<Content> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;

          // Extract title from filename (remove extension)
          const fileName = file.name.replace(/\.(txt|md|text)$/i, '');

          const newContent: Content = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: fileName || 'محتوى مُستورَد',
            content: text.trim(),
            type: 'article', // Default type
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: ['مُستورَد'],
            isPublished: false
          };

          setContents(prev => [newContent, ...prev]);
          resolve(newContent);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('فشل في قراءة الملف'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }, []);

  // Helper function to convert HTML to RTF
  const htmlToRtf = (html: string): string => {
    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Replace <br> and block elements with newlines
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('p, div').forEach(block => {
      block.prepend('\n');
    });

    // Get text content
    const text = (tempDiv.textContent || tempDiv.innerText || '').trim();

    // Convert to RTF format (escaping special characters and converting Arabic)
    let rtfContent = '';
    for (const char of text) {
      const code = char.charCodeAt(0);
      if (code > 127) {
        // Unicode character - use RTF unicode escape
        rtfContent += `\\u${code}?`;
      } else if (char === '\\') {
        rtfContent += '\\\\';
      } else if (char === '{') {
        rtfContent += '\\{';
      } else if (char === '}') {
        rtfContent += '\\}';
      } else if (char === '\n') {
        rtfContent += '\\par\n';
      } else {
        rtfContent += char;
      }
    }

    return rtfContent;
  };

  // Helper to convert plain text to RTF unicode
  const textToRtf = (text: string): string => {
    let rtfContent = '';
    for (const char of text) {
      const code = char.charCodeAt(0);
      if (code > 127) {
        rtfContent += `\\u${code}?`;
      } else if (char === '\\') {
        rtfContent += '\\\\';
      } else if (char === '{') {
        rtfContent += '\\{';
      } else if (char === '}') {
        rtfContent += '\\}';
      } else if (char === '\n') {
        rtfContent += '\\par\n';
      } else {
        rtfContent += char;
      }
    }
    return rtfContent;
  };

  const exportToRtf = useCallback(async (content: Content) => {
    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'story': return 'قصة';
        case 'article': return 'مقال';
        case 'poem': return 'قصيدة';
        case 'novel': return 'رواية';
        default: return type;
      }
    };

    const title = textToRtf(content.title);
    const typeLabel = textToRtf(getTypeLabel(content.type));
    const date = textToRtf(content.createdAt.toLocaleDateString('ar-SA'));
    const tags = textToRtf(content.tags.join('، ') || 'بدون وسوم');
    const body = htmlToRtf(content.content);
    const footer = textToRtf('تم التصدير من تطبيق مَحبرة');

    // RTF header with Arabic font support and RTL direction
    const rtfDoc = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset178 Traditional Arabic;}{\\f1\\fnil\\fcharset0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red100\\green100\\blue100;}
\\deflang1025\\rtlpar
\\f0\\fs28
{\\b\\fs36 ${title}}\\par
\\par
{\\cf2 ${textToRtf('النوع:')} ${typeLabel}}\\par
{\\cf2 ${textToRtf('التاريخ:')} ${date}}\\par
{\\cf2 ${textToRtf('الوسوم:')} ${tags}}\\par
\\par
{\\pard\\sb200\\sa200
${body}
\\par}
\\par
{\\cf2\\i ${footer}}
}`;

    const suggestedName = `${content.title.replace(/[^\w\u0600-\u06FF]/g, '_')}.rtf`;

    // Try to use File System Access API for choosing save location
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'Rich Text Format',
            accept: { 'application/rtf': ['.rtf'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(rtfDoc);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback download
    const blob = new Blob([rtfDoc], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportAllToRtf = useCallback(async () => {
    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'story': return 'قصة';
        case 'article': return 'مقال';
        case 'poem': return 'قصيدة';
        case 'novel': return 'رواية';
        default: return type;
      }
    };

    // Sort contents from oldest to newest
    const sortedContents = [...contents].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const allContent = sortedContents.map(content => {
      const title = textToRtf(content.title);
      const typeLabel = textToRtf(getTypeLabel(content.type));
      const date = textToRtf(content.createdAt.toLocaleDateString('ar-SA'));
      const tags = textToRtf(content.tags.join('، ') || 'بدون وسوم');
      const body = htmlToRtf(content.content);

      return `{\\b\\fs36 ${title}}\\par
\\par
{\\cf2 ${textToRtf('النوع:')} ${typeLabel}}\\par
{\\cf2 ${textToRtf('التاريخ:')} ${date}}\\par
{\\cf2 ${textToRtf('الوسوم:')} ${tags}}\\par
\\par
${body}
\\par
\\page`;
    }).join('\n');

    const rtfDoc = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset178 Traditional Arabic;}{\\f1\\fnil\\fcharset0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red100\\green100\\blue100;}
\\deflang1025\\rtlpar
\\f0\\fs28
${allContent}
{\\cf2\\i ${textToRtf('تم التصدير من تطبيق مَحبرة')}}
}`;

    const suggestedName = `محتويات_مَحبرة_${new Date().toLocaleDateString('ar-SA').replace(/\//g, '-')}.rtf`;

    // Try to use File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'Rich Text Format',
            accept: { 'application/rtf': ['.rtf'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(rtfDoc);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback download
    const blob = new Blob([rtfDoc], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [contents]);

  const exportAllSeparately = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('عذراً، هذه الميزة تتطلب متصفحاً حديثاً يدعم الوصول للمجلدات (مثل Google Chrome أو Edge).');
      return;
    }

    try {
      // Ask user to select a directory
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      const getTypeLabel = (type: string) => {
        switch (type) {
          case 'story': return 'قصة';
          case 'article': return 'مقال';
          case 'poem': return 'قصيدة';
          case 'novel': return 'رواية';
          default: return type;
        }
      };

      let successCount = 0;

      // Sort contents from oldest to newest
      const sortedContents = [...contents].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (const content of sortedContents) {
        // Prepare RTF content for this item
        const title = textToRtf(content.title);
        const typeLabel = textToRtf(getTypeLabel(content.type));
        const date = textToRtf(content.createdAt.toLocaleDateString('ar-SA'));
        const tags = textToRtf(content.tags.join('، ') || 'بدون وسوم');
        const body = htmlToRtf(content.content);
        const footer = textToRtf('تم التصدير من تطبيق مَحبرة');

        const rtfDoc = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset178 Traditional Arabic;}{\\f1\\fnil\\fcharset0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red100\\green100\\blue100;}
\\deflang1025\\rtlpar
\\f0\\fs28
{\\b\\fs36 ${title}}\\par
\\par
{\\cf2 ${textToRtf('النوع:')} ${typeLabel}}\\par
{\\cf2 ${textToRtf('التاريخ:')} ${date}}\\par
{\\cf2 ${textToRtf('الوسوم:')} ${tags}}\\par
\\par
{\\pard\\sb200\\sa200
${body}
\\par}
\\par
{\\cf2\\i ${footer}}
}`;

        // Create a safe filename
        const safeName = content.title.replace(/[^\w\u0600-\u06FF]/g, '_').trim() || 'bez_onwan';
        // Ensure unique filename if needed is handled by FS usually overwriting, but let's just write.
        // We will append .rtf
        const fileName = `${safeName}.rtf`;

        try {
          // Create file in the selected directory
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(rtfDoc);
          await writable.close();
          successCount++;
        } catch (err) {
          console.error(`Failed to separate export ${fileName}:`, err);
        }
      }

      return successCount;

    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled
      console.error('Directory picker error:', err);
      throw err;
    }
  }, [contents]);

  return {
    contents,
    isLoaded,
    addContent,
    updateContent,
    deleteContent,
    togglePublish,
    getContent,
    exportToText,
    exportAllToText,
    exportToRtf,
    exportAllToRtf,
    exportAllSeparately,
    importFromFile
  };
}

