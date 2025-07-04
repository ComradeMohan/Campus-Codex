'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground">
      <div
        className="container px-4 md:px-6 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline text-white">
          Ready to Transform Your Coding Education?
        </h2>
        <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto text-primary-foreground/80">
          Join a growing community of forward-thinking institutions and empowered students. 
          Get started with Campus Codex today and unlock the future of programming education.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button 
            asChild 
            size="lg" 
            className="bg-white text-primary hover:bg-gray-100 shadow-lg transition-transform hover:scale-105 px-8 py-6 text-base"
          >
            <Link href="/register/student">
              Student Sign Up <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg" 
            className="border-white text-white hover:bg-white/10 hover:text-white shadow-lg transition-transform hover:scale-105 px-8 py-6 text-base"
          >
            <Link href="/register/admin">
              Register Your College <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
