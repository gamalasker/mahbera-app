import { useState } from 'react';
import { Folder as FolderIcon, FolderPlus, Inbox, Layers, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Folder } from '@/types';

// معرّف افتراضي يمثل "بدون مجلد" (لا يمكن أن يتطابق مع أي معرّف مجلد حقيقي)
export const UNFILED_FOLDER_ID = '__unfiled__';

interface FolderSidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  countAll: number;
  countUnfiled: number;
  countByFolder: Record<string, number>;
}

export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  countAll,
  countUnfiled,
  countByFolder,
}: FolderSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);

  const handleCreate = () => {
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName);
    setNewFolderName('');
    setCreateOpen(false);
  };

  const handleRename = () => {
    if (!editingFolder || !editingName.trim()) return;
    onRenameFolder(editingFolder.id, editingName);
    setEditingFolder(null);
  };

  const itemBase =
    'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors touch-manipulation active:bg-muted';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground">المجلدات</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCreateOpen(true)}
          title="مجلد جديد"
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <div
          className={cn(
            itemBase,
            selectedFolderId === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
          onClick={() => onSelectFolder(null)}
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            الكل
          </span>
          <span className="text-xs opacity-70">{countAll}</span>
        </div>

        <div
          className={cn(
            itemBase,
            selectedFolderId === UNFILED_FOLDER_ID ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
          onClick={() => onSelectFolder(UNFILED_FOLDER_ID)}
        >
          <span className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            بدون مجلد
          </span>
          <span className="text-xs opacity-70">{countUnfiled}</span>
        </div>

        {folders.map(folder => (
          <div
            key={folder.id}
            className={cn(
              itemBase,
              selectedFolderId === folder.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            onClick={() => onSelectFolder(folder.id)}
          >
            <span className="flex items-center gap-2 min-w-0">
              <FolderIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{folder.name}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="text-xs opacity-70">{countByFolder[folder.id] ?? 0}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 -m-1 rounded hover:bg-black/10 touch-manipulation"
                    title="خيارات المجلد"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingFolder(folder);
                      setEditingName(folder.name);
                    }}
                  >
                    <Pencil className="w-4 h-4 ml-2" />
                    إعادة تسمية
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeletingFolder(folder)}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        ))}
      </div>

      {/* Create folder dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مجلد جديد</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="اسم المجلد"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعادة تسمية المجلد</DialogTitle>
          </DialogHeader>
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            placeholder="اسم المجلد"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFolder(null)}>إلغاء</Button>
            <Button onClick={handleRename}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirmation */}
      <AlertDialog open={!!deletingFolder} onOpenChange={(open) => !open && setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المجلد</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف مجلد "{deletingFolder?.name}" وسيتم نقل محتوياته إلى "بدون مجلد". هذا الإجراء لا يحذف المحتوى نفسه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingFolder) onDeleteFolder(deletingFolder.id);
                setDeletingFolder(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
