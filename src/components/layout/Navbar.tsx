
'use client';

import * as React from 'react';
import Link from 'next/link';
import { CodeXml, Menu, X, Sun, Moon, User, BookUser, Code2, BarChartHorizontalBig, LayoutDashboard, ExternalLink, Sparkles, MessageSquare } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { currentUser, userProfile } = useAuth();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    const initialTheme = storedTheme ? storedTheme : 'dark'; // Default to dark if nothing stored
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
    const commonLinkClasses = "text-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-primary-foreground";

    const navItemsToDisplay = siteConfig.navItems.filter(item => {
      if (currentUser) {
        return !["Login", "Register", "Home", "Features"].includes(item.label);
      }
      return true;
    });


    const regularNavItems = navItemsToDisplay.map((item) => {
        const linkButtonContent = (
          <Button variant="ghost" asChild className={commonLinkClasses}>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
        if (isSheetItem) {
          return (
            <SheetClose asChild key={`${item.label.toLowerCase().replace(' ', '-')}-sheet`}>
              {linkButtonContent}
            </SheetClose>
          );
        }
        return (
          React.cloneElement(linkButtonContent, { key: `${item.label.toLowerCase().replace(' ', '-')}-desktop` })
        );
      });

    const authConditionalLinks: JSX.Element[] = [];
    if (isMounted && currentUser) {
      if (userProfile?.role === 'super-admin') {
        const superAdminButtonContent = (
          <Button variant="ghost" asChild className={commonLinkClasses}>
             <Link href="/main-admin/dashboard" className="flex items-center gap-1.5"><BarChartHorizontalBig className="h-4 w-4"/> Platform Dashboard</Link>
          </Button>
        );
        if (isSheetItem) {
          authConditionalLinks.push(
            <SheetClose asChild key="super-admin-dashboard-sheet">{superAdminButtonContent}</SheetClose>
          );
        } else {
           authConditionalLinks.push(
            React.cloneElement(superAdminButtonContent, { key: "super-admin-dashboard-desktop" })
          );
        }
      }
      if (userProfile?.role === 'admin') {
        const adminButtonContent = (
          <Button variant="ghost" asChild className={commonLinkClasses}>
            <Link href="/admin/dashboard">College Dashboard</Link>
          </Button>
        );
        if (isSheetItem) {
          authConditionalLinks.push(
            <SheetClose asChild key="admin-dashboard-sheet">{adminButtonContent}</SheetClose>
          );
        } else {
           authConditionalLinks.push(
             React.cloneElement(adminButtonContent, { key: "admin-dashboard-desktop" })
           );
        }
      }
      if (userProfile?.role === 'student') {
        const studentLinksConfig = [
          { keyBase: 'student-resources', href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { keyBase: 'student-labs', href: '/student/labs', label: 'Labs', icon: null },
          { keyBase: 'student-flashcards', href: '/student/flashcards', label: 'AI Flashcards', icon: Sparkles },
          { keyBase: 'student-chat', href: '/student/chat', label: 'Chat', icon: MessageSquare },
          { keyBase: 'student-sandbox', href: '/student/sandbox', label: 'Sandbox', icon: Code2 },
          { keyBase: 'student-profile', href: '/student/profile', label: 'Profile', icon: User },
        ];
        studentLinksConfig.forEach(linkConfig => {
          const buttonContent = (
            <Button variant="ghost" asChild className={commonLinkClasses}>
              <Link href={linkConfig.href} className="flex items-center gap-1.5">
                {linkConfig.icon && <linkConfig.icon className="h-4 w-4"/>} {linkConfig.label}
              </Link>
            </Button>
          );
          if (isSheetItem) {
            authConditionalLinks.push(
              <SheetClose asChild key={`${linkConfig.keyBase}-sheet`}>{buttonContent}</SheetClose>
            );
          } else {
             authConditionalLinks.push(
                React.cloneElement(buttonContent, { key: `${linkConfig.keyBase}-desktop` })
            );
          }
        });
      }
      if (userProfile?.role === 'faculty') {
        const facultyButtonContent = (
          <Button variant="ghost" asChild className={commonLinkClasses}>
            <Link href="/faculty/dashboard" className="flex items-center gap-1.5"><BookUser className="h-4 w-4"/> My Dashboard</Link>
          </Button>
        );
        if (isSheetItem) {
          authConditionalLinks.push(
            <SheetClose asChild key="faculty-dashboard-sheet">{facultyButtonContent}</SheetClose>
          );
        } else {
          authConditionalLinks.push(
            React.cloneElement(facultyButtonContent, { key: "faculty-dashboard-desktop" })
          );
        }
      }

      authConditionalLinks.push(
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="text-foreground hover:bg-destructive/10 dark:hover:text-destructive-foreground"
          key="logout-button" 
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
        <Link href={currentUser && userProfile ? (userProfile.role === 'admin' ? '/admin/dashboard' : userProfile.role === 'student' ? '/student/labs' : userProfile.role === 'faculty' ? '/faculty/dashboard' : userProfile.role === 'super-admin' ? '/main-admin/dashboard' : '/') : '/'} className="flex items-center space-x-2">
          <CodeXml className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {createNavLinks(false)}
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="text-foreground hover:bg-primary/10">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </nav>

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
              <div className="flex justify-between items-center mb-6">
                <SheetTitle asChild>
                  <Link href={currentUser && userProfile ? (userProfile.role === 'admin' ? '/admin/dashboard' : userProfile.role === 'student' ? '/student/labs' : userProfile.role === 'faculty' ? '/faculty/dashboard' : userProfile.role === 'super-admin' ? '/main-admin/dashboard' : '/') : '/'} className="flex items-center space-x-2" onClick={() => setIsSheetOpen(false)}>
                    <CodeXml className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
                  </Link>
                </SheetTitle>
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
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
