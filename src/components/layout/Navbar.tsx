
'use client';

import Link from 'next/link';
import { CodeXml, Menu, X, Sun, Moon, User } from 'lucide-react';
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
  const [theme, setTheme] = useState('dark'); // Default to dark

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    const initialTheme = storedTheme ? storedTheme : 'dark'; // Default to dark if nothing in localStorage
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [theme, isMounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
      if (isSheetOpen) {
        setIsSheetOpen(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const createNavLinks = (isSheetItem: boolean) => {
    const commonLinkClasses = "text-foreground hover:bg-primary/10";

    const regularNavItems = siteConfig.navItems
      .filter(item => !((item.label === "Login" || item.label === "Register") && currentUser))
      .map((item) => {
        const linkButtonContent = (
          <Button variant="ghost" asChild className={commonLinkClasses}>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
        if (isSheetItem) {
          return (
            <SheetClose asChild key={item.label}>
              {linkButtonContent}
            </SheetClose>
          );
        }
        return (
          <Button variant="ghost" asChild className={commonLinkClasses} key={item.label}>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      });

    const authConditionalLinks: JSX.Element[] = [];
    if (isMounted && currentUser) {
      if (userProfile?.role === 'admin') {
        const adminLink = (
          <Button variant="ghost" asChild className={commonLinkClasses}>
            <Link href="/admin/dashboard">Dashboard</Link>
          </Button>
        );
        if (isSheetItem) {
          authConditionalLinks.push(
            <SheetClose asChild key="admin-dashboard">{adminLink}</SheetClose>
          );
        } else {
          authConditionalLinks.push(
             <Button variant="ghost" asChild className={commonLinkClasses} key="admin-dashboard">
                <Link href="/admin/dashboard">Dashboard</Link>
            </Button>
          );
        }
      }
      if (userProfile?.role === 'student') {
        const studentLabsLink = (
          <Button variant="ghost" asChild className={commonLinkClasses}>
            <Link href="/student/labs">Labs</Link>
          </Button>
        );
        const studentProfileLink = (
           <Button variant="ghost" asChild className={commonLinkClasses}>
            <Link href="/student/profile" className="flex items-center gap-1.5"> <User className="h-4 w-4"/> Profile</Link>
          </Button>
        );

        if (isSheetItem) {
          authConditionalLinks.push(
            <SheetClose asChild key="student-labs">{studentLabsLink}</SheetClose>
          );
           authConditionalLinks.push(
            <SheetClose asChild key="student-profile">{studentProfileLink}</SheetClose>
          );
        } else {
          authConditionalLinks.push(
            <Button variant="ghost" asChild className={commonLinkClasses} key="student-labs">
                <Link href="/student/labs">Labs</Link>
            </Button>
          );
           authConditionalLinks.push(
            <Button variant="ghost" asChild className={commonLinkClasses} key="student-profile">
                 <Link href="/student/profile" className="flex items-center gap-1.5"> <User className="h-4 w-4"/> Profile</Link>
            </Button>
          );
        }
      }
      authConditionalLinks.push(
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="text-foreground hover:bg-destructive/10"
          key="logout"
        >
          Logout
        </Button>
      );
    }

    return (
      <>
        {regularNavItems}
        {authConditionalLinks}
      </>
    );
  };
  
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
        <nav className="hidden md:flex items-center space-x-1">
          {createNavLinks(false)}
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="text-foreground hover:bg-primary/10">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="mr-2 text-foreground hover:bg-primary/10">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
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
                 {createNavLinks(true)}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
