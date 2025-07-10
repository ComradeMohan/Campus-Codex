
'use client';

import type { editor } from 'monaco-editor';
import Editor, { type OnChange, type OnMount } from '@monaco-editor/react';
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface MonacoCodeEditorProps {
  language: string;
  value: string;
  onChange: OnChange;
  onMount?: OnMount;
  height?: string | number;
  options?: editor.IStandaloneEditorConstructionOptions;
}

const mapLanguageToMonaco = (langName: string): string => {
  const lowerLang = langName.toLowerCase();
  // Monaco uses 'typescript' for both JavaScript and TypeScript
  if (lowerLang === 'javascript') return 'typescript';
  if (lowerLang === 'python') return 'python';
  if (lowerLang === 'java') return 'java';
  if (lowerLang === 'c++' || lowerLang === 'cpp') return 'cpp';
  if (lowerLang === 'c#' || lowerLang === 'csharp') return 'csharp';
  if (lowerLang === 'html') return 'html';
  if (lowerLang === 'css') return 'css';
  if (lowerLang === 'sql') return 'sql';
  // Default, or could return a generic like 'plaintext'
  return lowerLang;
};

export function MonacoCodeEditor({
  language,
  value,
  onChange,
  onMount,
  height = '60vh', // Default height
  options,
}: MonacoCodeEditorProps) {
  const [editorTheme, setEditorTheme] = useState('vs-light'); // Default to light

  useEffect(() => {
    // Function to update theme based on HTML class
    const updateTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setEditorTheme(isDarkMode ? 'vs-dark' : 'vs-light');
    };

    // Initial theme check
    updateTheme();

    // Observe changes to the <html> element's class attribute
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateTheme();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    // Cleanup observer on component unmount
    return () => observer.disconnect();
  }, []);

  const monacoLanguage = mapLanguageToMonaco(language);

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    fontSize: 14,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true, // Ensures editor resizes correctly
    wordWrap: 'on', // Enable word wrapping
    padding: {
        top: 10,
        bottom: 10
    },
    ...options,
  };

  return (
    <Editor
      height={height}
      language={monacoLanguage}
      theme={editorTheme}
      value={value}
      onChange={onChange}
      onMount={onMount}
      options={defaultOptions}
      loading={<Loader2 className="h-12 w-12 animate-spin text-primary" />}
    />
  );
}
