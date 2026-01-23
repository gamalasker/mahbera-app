import { useRef, useEffect, useCallback, useState } from 'react';
import {
    Bold,
    Italic,
    Underline,
    AlignRight,
    AlignCenter,
    AlignLeft,
    Highlighter,
    Palette,
    Type,
    List,
    ListOrdered
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const COLORS = [
    '#000000', '#374151', '#6B7280',
    '#EF4444', '#F97316', '#F59E0B',
    '#10B981', '#14B8A6', '#3B82F6',
    '#6366F1', '#8B5CF6', '#EC4899'
];

const HIGHLIGHT_COLORS = [
    '#FEF08A', '#FDE68A', '#D9F99D',
    '#A7F3D0', '#99F6E4', '#BAE6FD',
    '#C7D2FE', '#DDD6FE', '#FBCFE8'
];

const FONTS = [
    { name: 'Amiri', value: 'Amiri, serif' },
    { name: 'Noto Naskh', value: '"Noto Naskh Arabic", serif' },
    { name: 'Cairo', value: 'Cairo, sans-serif' },
    { name: 'Tajawal', value: 'Tajawal, sans-serif' },
];

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [wordCount, setWordCount] = useState(0);
    const [currentFont, setCurrentFont] = useState(FONTS[0].value);

    // Update word count
    useEffect(() => {
        if (editorRef.current) {
            const text = editorRef.current.innerText || '';
            const words = text.trim().split(/\s+/).filter(word => word.length > 0);
            setWordCount(words.length);
        }
    }, [value]);

    // Set initial content and update when value changes externally
    useEffect(() => {
        if (editorRef.current && value !== undefined) {
            // Only update if the content is different (to avoid cursor jumping)
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
            const text = editorRef.current.innerText || '';
            const words = text.trim().split(/\s+/).filter(word => word.length > 0);
            setWordCount(words.length);
        }
    }, [onChange]);

    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    }, [handleInput]);

    const handleFontChange = (font: string) => {
        setCurrentFont(font);
        execCommand('fontName', font);
    };

    const ToolbarButton = ({
        onClick,
        icon: Icon,
        title,
        active = false
    }: {
        onClick: () => void;
        icon: React.ComponentType<{ className?: string }>;
        title: string;
        active?: boolean;
    }) => (
        <Button
            type="button"
            variant={active ? "default" : "ghost"}
            size="sm"
            onClick={onClick}
            title={title}
            className="h-8 w-8 p-0"
        >
            <Icon className="w-4 h-4" />
        </Button>
    );

    return (
        <div className="rich-text-editor border rounded-lg overflow-hidden bg-background">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
                {/* Font Family */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                            <Type className="w-4 h-4" />
                            <span className="text-xs hidden sm:inline">الخط</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                        <div className="space-y-1">
                            {FONTS.map((font) => (
                                <button
                                    key={font.name}
                                    type="button"
                                    onClick={() => handleFontChange(font.value)}
                                    className={`w-full text-right px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${currentFont === font.value ? 'bg-accent' : ''
                                        }`}
                                    style={{ fontFamily: font.value }}
                                >
                                    {font.name}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Text Formatting */}
                <ToolbarButton
                    onClick={() => execCommand('bold')}
                    icon={Bold}
                    title="عريض"
                />
                <ToolbarButton
                    onClick={() => execCommand('italic')}
                    icon={Italic}
                    title="مائل"
                />
                <ToolbarButton
                    onClick={() => execCommand('underline')}
                    icon={Underline}
                    title="مسطر"
                />

                <div className="w-px h-6 bg-border mx-1" />

                {/* Text Color */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="لون النص">
                            <Palette className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                        <div className="grid grid-cols-4 gap-2">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => execCommand('foreColor', color)}
                                    className="w-7 h-7 rounded-md border-2 border-transparent hover:border-primary transition-all hover:scale-110"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Highlight Color */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="تظليل">
                            <Highlighter className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                        <div className="grid grid-cols-3 gap-2">
                            {HIGHLIGHT_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => execCommand('hiliteColor', color)}
                                    className="w-7 h-7 rounded-md border-2 border-transparent hover:border-primary transition-all hover:scale-110"
                                    style={{ backgroundColor: color }}
                                    title="تظليل"
                                />
                            ))}
                            <button
                                type="button"
                                onClick={() => execCommand('hiliteColor', 'transparent')}
                                className="w-7 h-7 rounded-md border-2 border-dashed border-muted-foreground hover:border-primary transition-all text-xs"
                                title="إزالة التظليل"
                            >
                                ✕
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Alignment */}
                <ToolbarButton
                    onClick={() => execCommand('justifyRight')}
                    icon={AlignRight}
                    title="محاذاة يمين"
                />
                <ToolbarButton
                    onClick={() => execCommand('justifyCenter')}
                    icon={AlignCenter}
                    title="محاذاة وسط"
                />
                <ToolbarButton
                    onClick={() => execCommand('justifyLeft')}
                    icon={AlignLeft}
                    title="محاذاة يسار"
                />

                <div className="w-px h-6 bg-border mx-1" />

                {/* Lists */}
                <ToolbarButton
                    onClick={() => execCommand('insertUnorderedList')}
                    icon={List}
                    title="قائمة نقطية"
                />
                <ToolbarButton
                    onClick={() => execCommand('insertOrderedList')}
                    icon={ListOrdered}
                    title="قائمة مرقمة"
                />

                {/* Word Count */}
                <div className="mr-auto text-sm text-muted-foreground px-2">
                    {wordCount} كلمة
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="min-h-[400px] p-4 focus:outline-none prose prose-lg max-w-none"
                style={{
                    fontFamily: 'Amiri, "Noto Naskh Arabic", serif',
                    direction: 'rtl',
                    textAlign: 'right',
                    lineHeight: '2'
                }}
                data-placeholder={placeholder || 'ابدأ الكتابة هنا...'}
                suppressContentEditableWarning
            />
        </div>
    );
}
