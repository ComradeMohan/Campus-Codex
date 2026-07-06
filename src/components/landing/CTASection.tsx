'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CTASection() {
  return (
    <section className="py-24 md:py-36 relative overflow-hidden bg-gradient-to-r from-primary via-indigo-600 to-accent text-white">
      {/* Decorative floating spheres in background */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-white/5 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-10 h-[250px] w-[250px] rounded-full bg-white/5 blur-[80px] pointer-events-none"></div>

      <div className="container px-4 md:px-6 text-center relative z-10 space-y-8">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl font-headline text-white leading-tight">
          Ready to Transform Your Coding Education?
        </h2>
        <p className="text-lg md:text-xl max-w-3xl mx-auto text-white/90 leading-relaxed">
          Join a growing community of forward-thinking institutions and empowered students. 
          Get started with Campus Codex today and unlock the future of programming education.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row pt-4">
          <Button 
            asChild 
            size="lg" 
            className="bg-white text-primary hover:bg-white/95 hover:text-primary-dark shadow-xl hover:scale-[1.03] active:scale-[0.98] px-8 py-6 text-base font-bold transition-all duration-300 rounded-xl"
          >
            <Link href="/register/student" className="flex items-center gap-2">
              Student Sign Up <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg" 
            className="border-white/30 text-white hover:bg-white/10 hover:border-white shadow-xl hover:scale-[1.03] active:scale-[0.98] px-8 py-6 text-base font-bold transition-all duration-300 rounded-xl"
          >
            <Link href="/register/admin" className="flex items-center gap-2">
              Register Your College <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

