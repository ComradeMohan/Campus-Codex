import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/60 dark:bg-background/20 backdrop-blur-sm py-8 md:py-16 relative overflow-hidden">
      {/* Subtle footer background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

      <div className="container px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pb-8 md:pb-12 border-b border-border/40">
          <div className="space-y-3 md:space-y-4">
            <Link href="/" className="flex items-center group">
              <span className="font-extrabold text-lg md:text-xl font-headline tracking-tight group-hover:text-primary transition-colors">{siteConfig.name}</span>
            </Link>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm">{siteConfig.description}</p>
          </div>
          
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs md:text-sm font-bold tracking-wider uppercase font-headline text-foreground">Quick Links</h3>
            <ul className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-1.5 md:gap-2.5">
              {siteConfig.footerNavItems.map((item) => (
                <li key={item.label}>
                  <Link 
                    href={item.href}
                    className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs md:text-sm font-bold tracking-wider uppercase font-headline text-foreground">Contact & Connect</h3>
            <div className="space-y-1 md:space-y-1.5">
              <p className="text-xs md:text-sm text-muted-foreground">
                <a href={`mailto:${siteConfig.footer.contactEmail}`} className="hover:text-primary transition-colors duration-200">{siteConfig.footer.contactEmail}</a>
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">{siteConfig.footer.address}</p>
            </div>
            
            <div className="flex gap-2 md:gap-2.5 pt-1 md:pt-2">
              {siteConfig.footer.socialLinks.map((link) => (
                <Button 
                  variant="outline" 
                  size="icon" 
                  asChild 
                  key={link.name} 
                  className="rounded-full h-8 w-8 md:h-9 md:w-9 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all duration-300"
                >
                  <Link href={link.href} target="_blank" rel="noopener noreferrer">
                    <link.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="sr-only">{link.name}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 text-center sm:text-left text-[10px] md:text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p className="italic bg-primary/5 text-primary px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-primary/10 text-[10px] md:text-xs">
            Built by students, for students — with the power of AI
          </p>
        </div>
      </div>
    </footer>
  );
}

