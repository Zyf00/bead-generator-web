'use client';

import React, { useEffect, useState } from 'react';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { EditorSidebar } from './EditorSidebar';
import { CropModal } from './CropModal';
import { ExportModal } from './ExportModal';
import { useEditorStore } from '../../store/useEditorStore';

interface EditorWorkspaceProps {
  initialImportOpen: boolean;
}

export function EditorWorkspace({ initialImportOpen }: EditorWorkspaceProps) {
  const [isImportOpen, setIsImportOpen] = useState(initialImportOpen);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { saveToDb } = useEditorStore();

  useEffect(() => {
    const timer = setInterval(() => {
      saveToDb().catch((error) => console.error('自动保存失败', error));
    }, 15000);

    return () => clearInterval(timer);
  }, [saveToDb]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      <EditorHeader
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 flex flex-row overflow-hidden relative">
        <EditorToolbar />
        <EditorCanvas />
        <EditorSidebar />
      </main>

      <CropModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
