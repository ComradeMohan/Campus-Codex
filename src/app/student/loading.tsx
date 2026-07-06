'use client';

import React from 'react';
import { Terminal } from 'lucide-react';

export default function StudentLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4 select-none animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full border border-primary/20 animate-ping duration-1000"></div>
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center bg-card shadow-md">
          <Terminal className="h-4.5 w-4.5 text-primary animate-pulse" />
        </div>
      </div>
      <div className="space-y-1 text-center animate-pulse">
        <h4 className="text-xs font-bold font-mono text-foreground tracking-wide">Initializing Lab Workspace...</h4>
        <p className="text-[10px] text-muted-foreground font-sans">Connecting to secure databases</p>
      </div>
    </div>
  );
}
