'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

export function Dropzone() {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const htmlFile = files.find((file) => file.name.endsWith('.html'));

    if (htmlFile) {
      // TODO: Handle file upload in next task
      console.log('File dropped:', htmlFile.name);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Handle file upload in next task
      console.log('File selected:', file.name);
    }
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <label
        htmlFor="file-upload"
        className="group relative block cursor-pointer"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={`
            relative overflow-hidden rounded-2xl border-2 border-dashed
            bg-card p-16 transition-all duration-300
            ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-card/80'
            }
          `}
        >
          {/* Glow effect on hover */}
          <div
            className={`
              pointer-events-none absolute inset-0 rounded-2xl opacity-0
              transition-opacity duration-500 group-hover:opacity-100
              ${isDragging ? 'opacity-100' : ''}
            `}
            style={{
              background:
                'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
            }}
          />

          <div className="relative flex flex-col items-center gap-4 text-center">
            <div
              className={`
                rounded-full bg-primary/10 p-6 transition-all duration-300
                ${isDragging ? 'scale-110 bg-primary/20' : 'group-hover:scale-105'}
              `}
            >
              <Upload
                className={`
                  h-10 w-10 transition-colors duration-300
                  ${isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}
                `}
              />
            </div>

            <div className="space-y-2">
              <p
                className={`
                  text-xl font-medium transition-colors duration-300
                  ${isDragging ? 'text-primary' : 'text-foreground'}
                `}
              >
                {isDragging ? 'Drop your Chrome bookmarks file' : 'Drop your Chrome bookmarks.html here'}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          </div>
        </div>

        <input
          id="file-upload"
          type="file"
          accept=".html"
          className="sr-only"
          onChange={handleFileInput}
          aria-label="Drop your Chrome bookmarks file here or click to browse"
        />
      </label>

      {/* Instructions */}
      <div className="mt-8 space-y-3 rounded-xl border border-border/50 bg-muted/30 p-6">
        <h3 className="text-sm font-semibold text-foreground">How to export from Chrome:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              1
            </span>
            <span>Open Chrome → Bookmarks → Bookmark Manager</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              2
            </span>
            <span>Click ⋮ → Export bookmarks</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              3
            </span>
            <span>Drop the file here</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
