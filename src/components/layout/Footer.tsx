
import Link from 'next/link';
import { CodeXml } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 py-8">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <CodeXml className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
            </Link>
            <p className="text-sm text-muted-foreground">{siteConfig.description}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 font-headline">Quick Links</h3>
            <ul className="space-y-2">
              {siteConfig.footerNavItems.map((item) => (
                <li key={item.label}>
                  <Button variant="link" asChild className="p-0 h-auto text-muted-foreground hover:text-primary">
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 font-headline">Contact Us</h3>
            <p className="text-sm text-muted-foreground mb-1">Email: {siteConfig.footer.contactEmail}</p>
            <p className="text-sm text-muted-foreground">{siteConfig.footer.address}</p>
            <div className="flex space-x-2 mt-4">
              {siteConfig.footer.socialLinks.map((link) => (
                <Button variant="ghost" size="icon" asChild key={link.name} className="text-muted-foreground hover:text-primary">
                  <Link href={link.href} target="_blank" rel="noopener noreferrer">
                    <link.icon className="h-5 w-5" />
                    <span className="sr-only">{link.name}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p className="mt-2 italic">Built by students, for students — with the power of AI</p>
        </div>
      </div>
    </footer>
  );
}
