'use client';

import React from 'react';
import { Terminal } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md transition-all duration-300">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      
      {/* Soft glowing ambient backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[250px] w-[250px] rounded-full bg-primary/10 blur-[80px] pointer-events-none"></div>
      
      <div className="relative flex flex-col items-center space-y-4 select-none">
        <div className="relative flex items-center justify-center">
          {/* Animated rings */}
          <div className="absolute h-20 w-20 rounded-full border border-primary/30 animate-ping duration-1000"></div>
          <div className="absolute h-16 w-16 rounded-full border border-accent/20 animate-pulse"></div>
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center bg-card shadow-xl">
            <Terminal className="h-5 w-5 text-primary animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-1 text-center">
          <h3 className="text-sm font-extrabold tracking-wider font-headline text-foreground flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
            Loading Campus Codex...
          </h3>
          <p className="text-[10px] text-muted-foreground font-mono">Resolving workspace secure route</p>
        </div>
      </div>
    </div>
  );
}
