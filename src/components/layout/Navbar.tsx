'use client';

import Link from 'next/link';
import { CodeXml, Menu, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { currentUser, userProfile } = useAuth();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navLinks = (
    <>
      {siteConfig.navItems.map((item) => {
        if ((item.label === "Login" || item.label === "Register") && currentUser) return null;
        return (
          <SheetClose asChild key={item.label}>
            <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          </SheetClose>
        );
      })}
      {isMounted && currentUser && (
        <>
          {userProfile?.role === 'admin' && (
            <SheetClose asChild>
              <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10">
                <Link href="/admin/dashboard">Dashboard</Link>
              </Button>
            </SheetClose>
          )}
          {userProfile?.role === 'student' && (
            <SheetClose asChild>
              <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10">
                <Link href="/student/labs">Labs</Link>
              </Button>
            </SheetClose>
          )}
          <Button variant="ghost" onClick={handleSignOut} className="text-foreground hover:bg-destructive/10">
            Logout
          </Button>
        </>
      )}
    </>
  );
  
  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <CodeXml className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
          </Link>
        </div>
      </header>
    );
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <CodeXml className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          {navLinks}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <Link href="/" className="flex items-center space-x-2" onClick={() => setIsSheetOpen(false)}>
                    <CodeXml className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
                  </Link>
                  <SheetClose asChild>
                     <Button variant="ghost" size="icon">
                        <X className="h-6 w-6" />
                        <span className="sr-only">Close menu</span>
                      </Button>
                  </SheetClose>
                </div>
                <nav className="flex flex-col space-y-3">
                 {navLinks}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
