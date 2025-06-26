import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function HeroSection() {
  return (
    <section
      className="py-20 md:py-32 relative 
                 bg-gradient-to-br from-background to-secondary
                 dark:bg-[url('https://i.ibb.co/pjQXjTHW/ab261348324ec2f390f6662641e238d9.jpg')] 
                 dark:bg-cover dark:bg-center dark:bg-no-repeat overflow-hidden"
    >
      <div className="absolute inset-0 bg-black/70 z-0 hidden dark:block"></div>
      <div className="container px-4 md:px-6 relative z-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline text-foreground dark:text-white animate-in fade-in slide-in-from-top-4 duration-700">
              Master Programming with Interactive Labs
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-200 md:text-xl animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
              Empowering students with code labs and online tests. Campus Codex is your partner in coding education excellence.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
              <Button asChild size="lg" className="bg-accent text-accent-foreground dark:text-white hover:bg-accent/90 shadow-md transition-transform hover:scale-105">
                <Link href="/register/student">Join as a Student</Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="shadow-md transition-transform hover:scale-105 
                           border-primary text-primary hover:bg-primary/10 hover:text-primary 
                           dark:text-primary dark:hover:text-primary-foreground dark:hover:bg-primary/10"
              >
                <Link href="/register/admin">Register Your College</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl group animate-in fade-in slide-in-from-right-8 duration-700 delay-400">
            <Image
              src="https://i.ibb.co/4w9cBSTL/b48e06090403848402ed0c3f7ce984a9.jpg"
              alt="Abstract background with code-like elements"
              fill
              style={{ objectFit: 'cover' }}
              className="transform transition-transform duration-500 group-hover:scale-105"
              data-ai-hint="abstract background"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
             <div className="absolute bottom-4 left-4 text-white p-2 rounded bg-black/30 backdrop-blur-sm">
                <h3 className="text-lg font-semibold">Interactive Labs</h3>
                <p className="text-sm"></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
