
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon, User, BookUser, Code2, BarChartHorizontalBig, LayoutDashboard, ExternalLink, Sparkles, MessageSquare, Home, Layers, UserPlus, LogIn, LogOut, Terminal } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { currentUser, userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  const NAV_ICON_MAP: { [key: string]: React.ComponentType<any> } = {
    "Home": Home,
    "Features": Layers,
    "Register": UserPlus,
    "Login": LogIn,
  };

  const createNavLinks = (isSheetItem: boolean) => {
    const commonLinkClasses = "rounded-full text-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-primary-foreground";

    const navItemsToDisplay = siteConfig.navItems.filter(item => {
      if (currentUser) {
        return !["Login", "Register", "Home", "Features"].includes(item.label);
      }
      return true;
    });

    const regularNavItems = navItemsToDisplay.map((item) => {
        const IconComponent = NAV_ICON_MAP[item.label] || Code2;
        const linkButtonContent = (
          <Button 
            variant="ghost" 
            asChild 
            className={cn(
              isSheetItem 
                ? "w-full justify-start gap-3 py-6 px-4 rounded-xl text-base border border-transparent hover:border-primary/10 hover:bg-primary/5 text-foreground hover:text-primary" 
                : commonLinkClasses
            )}
          >
            <Link href={item.href} className="flex items-center gap-2">
              {isSheetItem && <IconComponent className="h-5 w-5 text-primary/70" />}
              {item.label}
            </Link>
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
      const getLinkStyles = (isActive: boolean) => {
        return isSheetItem
          ? cn(
              "w-full justify-start gap-3 py-6 px-4 rounded-xl text-base border transition-all",
              isActive
                ? "bg-primary/10 text-primary border-primary/20 font-bold"
                : "border-transparent hover:border-primary/10 hover:bg-primary/5 text-foreground hover:text-primary"
            )
          : cn(
              "rounded-full font-bold px-4 py-2 transition-all border",
              isActive
                ? "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30"
                : "text-foreground border-transparent hover:bg-primary/5 hover:text-primary hover:border-primary/10 dark:hover:bg-primary/5 dark:hover:text-primary dark:hover:border-primary/15"
            );
      };

      if (userProfile?.role === 'super-admin') {
        const isSuperAdminActive = pathname === "/main-admin/dashboard";
        const superAdminButtonContent = (
          <Button 
            variant="ghost" 
            asChild 
            className={getLinkStyles(isSuperAdminActive)}
          >
             <Link href="/main-admin/dashboard" className="flex items-center gap-2"><BarChartHorizontalBig className={cn("h-4 w-4", isSheetItem ? "h-5 w-5 text-primary/70" : "")}/> Platform Dashboard</Link>
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
        const isAdminActive = pathname === "/admin/dashboard" || pathname?.startsWith("/admin/");
        const adminButtonContent = (
          <Button 
            variant="ghost" 
            asChild 
            className={getLinkStyles(isAdminActive)}
          >
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className={cn("h-4 w-4", isSheetItem ? "h-5 w-5 text-primary/70" : "")} /> College Dashboard
            </Link>
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
          { keyBase: 'student-labs', href: '/student/labs', label: 'Labs', icon: Code2 },
          { keyBase: 'student-flashcards', href: '/student/flashcards', label: 'AI Flashcards', icon: Sparkles },
          { keyBase: 'student-chat', href: '/student/chat', label: 'Chat', icon: MessageSquare },
          { keyBase: 'student-sandbox', href: '/student/sandbox', label: 'Sandbox', icon: Terminal },
          { keyBase: 'student-profile', href: '/student/profile', label: 'Profile', icon: User },
        ];
        studentLinksConfig.forEach(linkConfig => {
          const isStudentActive = pathname === linkConfig.href || (linkConfig.href !== '/student/dashboard' && pathname?.startsWith(linkConfig.href));
          const buttonContent = (
            <Button 
              variant="ghost" 
              asChild 
              className={getLinkStyles(isStudentActive)}
            >
              <Link href={linkConfig.href} className="flex items-center gap-2">
                {linkConfig.icon && <linkConfig.icon className={cn("h-4.5 w-4.5", isSheetItem ? "h-5 w-5 text-primary/70" : "")}/>} {linkConfig.label}
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
        const isFacultyActive = pathname === "/faculty/dashboard" || pathname?.startsWith("/faculty/");
        const facultyButtonContent = (
          <Button 
            variant="ghost" 
            asChild 
            className={getLinkStyles(isFacultyActive)}
          >
            <Link href="/faculty/dashboard" className="flex items-center gap-2"><BookUser className={cn("h-4 w-4", isSheetItem ? "h-5 w-5 text-primary/70" : "")}/> My Dashboard</Link>
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

      const logoutBtn = (
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            isSheetItem 
              ? "w-full justify-start gap-3 py-6 px-4 rounded-xl text-base border border-transparent hover:bg-destructive/10 text-foreground hover:text-destructive" 
              : "rounded-full py-1.5 px-4 text-sm font-medium text-foreground hover:bg-destructive/10 dark:hover:text-destructive-foreground"
          )}
          key="logout-button" 
        >
          {isSheetItem && <LogOut className="h-5 w-5 text-destructive/70" />}
          Logout
        </Button>
      );
      if (isSheetItem) {
        authConditionalLinks.push(
          <SheetClose asChild key="logout-button-sheet">{logoutBtn}</SheetClose>
        );
      } else {
        authConditionalLinks.push(logoutBtn);
      }
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
      <div className="sticky top-0 z-50 w-full px-4 pt-4 md:px-8 pointer-events-none">
        <header className="mx-auto max-w-7xl w-full pointer-events-auto rounded-full border border-border/40 bg-background/85 dark:bg-background/70 backdrop-blur-md shadow-md flex h-16 items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center">
            <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
          </Link>
        </header>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full px-4 pt-4 md:px-8 pointer-events-none">
      <header className="mx-auto max-w-7xl w-full pointer-events-auto rounded-full border border-border/40 bg-background/85 dark:bg-background/70 backdrop-blur-md shadow-md hover:shadow-lg hover:border-primary/20 transition-all duration-300 flex h-16 items-center justify-between px-6 md:px-8">
        <Link href={currentUser && userProfile ? (userProfile.role === 'admin' ? '/admin/dashboard' : userProfile.role === 'student' ? '/student/labs' : userProfile.role === 'faculty' ? '/faculty/dashboard' : userProfile.role === 'super-admin' ? '/main-admin/dashboard' : '/') : '/'} className="flex items-center">
          <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {createNavLinks(false)}
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="text-foreground hover:bg-primary/10 rounded-full">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </nav>

        <div className="md:hidden flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="mr-2 text-foreground hover:bg-primary/10 rounded-full">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background p-6">
              <div className="flex justify-between items-center mb-6">
                <SheetTitle asChild>
                  <Link href={currentUser && userProfile ? (userProfile.role === 'admin' ? '/admin/dashboard' : userProfile.role === 'student' ? '/student/labs' : userProfile.role === 'faculty' ? '/faculty/dashboard' : userProfile.role === 'super-admin' ? '/main-admin/dashboard' : '/') : '/'} className="flex items-center" onClick={() => setIsSheetOpen(false)}>
                    <span className="font-bold text-xl font-headline">{siteConfig.name}</span>
                  </Link>
                </SheetTitle>
                <SheetClose asChild>
                   <Button variant="ghost" size="icon" className="rounded-full">
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
      </header>
    </div>
  );
}
