import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';

export function HeroSection() {
  return (
    <section
      className="py-24 md:py-36 relative overflow-hidden bg-gradient-to-b from-background via-background to-secondary/30 dark:from-background dark:to-background"
    >
      {/* Decorative background grid and glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px] pointer-events-none"></div>

      <div className="container px-4 md:px-6 relative z-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          <div className="space-y-8 lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium animate-in fade-in duration-500">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              The Ultimate Coding Education Platform
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline leading-tight animate-in fade-in slide-in-from-top-4 duration-700">
              Master Programming with <span className="text-gradient">Interactive Labs</span>
            </h1>

            <p className="text-lg text-muted-foreground dark:text-gray-300 md:text-xl leading-relaxed max-w-2xl animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
              Empowering students with hand-on code labs, secure online tests, and automated feedback. Campus Codex is your key to programming excellence.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
              <Button 
                asChild 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.98] hover-glow transition-all duration-300 rounded-xl"
              >
                <Link href="/register/student" className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" /> Join as a Student
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 rounded-xl"
              >
                <Link href="/register/admin" className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Register Your College
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative lg:col-span-5 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            {/* Ambient shadow card behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 to-accent/25 rounded-2xl blur-2xl opacity-60 dark:opacity-40 animate-pulse-subtle"></div>
            
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/50 shadow-2xl group animate-float bg-card">
              <Image
                src="https://i.ibb.co/4w9cBSTL/b48e06090403848402ed0c3f7ce984a9.jpg"
                alt="Abstract background with code-like elements"
                fill
                style={{ objectFit: 'cover' }}
                className="transform transition-transform duration-700 group-hover:scale-105"
                data-ai-hint="abstract background"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>
              <div className="absolute bottom-6 left-6 text-white p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 max-w-[80%] transition-all duration-300 group-hover:translate-y-[-4px]">
                <h3 className="text-lg font-semibold font-headline">Interactive Labs</h3>
                <p className="text-xs text-white/80 mt-1">Write, compile, and debug code right inside your web browser with immediate AI feedback.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

