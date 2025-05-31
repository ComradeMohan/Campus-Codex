import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-background to-secondary">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline">
              Turn your ideas into apps with <span className="text-primary">AI</span>
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Empowering students with code labs and online tests. Campus Codex is your partner in coding education excellence.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md transition-transform hover:scale-105">
                <Link href="/register/student">Join as a Student</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="shadow-md transition-transform hover:scale-105 border-primary text-primary hover:bg-primary/10">
                <Link href="/register/admin">Register Your College</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl group">
            <Image
              src="https://placehold.co/600x400.png"
              alt="Coding lab illustration"
              layout="fill"
              objectFit="cover"
              className="transform transition-transform duration-500 group-hover:scale-105"
              data-ai-hint="coding students collaboration"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
             <div className="absolute bottom-4 left-4 text-white p-2 rounded bg-black/30 backdrop-blur-sm">
                <h3 className="text-lg font-semibold">Interactive Labs</h3>
                <p className="text-sm">Real-time AI assistance.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
