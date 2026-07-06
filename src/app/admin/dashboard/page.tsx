
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Settings, BookOpen, UserCog, Loader2, SlidersHorizontal, ExternalLink, Send, Database } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboardPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [activeCoursesCount, setActiveCoursesCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const dashboardItems = [
    { title: "User Management", description: "View and manage student and faculty accounts.", icon: Users, href: "/admin/users" },
    { title: "Course Management", description: "Create, edit, and organize courses and labs.", icon: BookOpen, href: "/admin/courses" },
    { title: "Notifications", description: "Send push notifications to students and faculty.", icon: Send, href: "/admin/notifications" },
    { title: "Platform Analytics", description: "Track usage statistics and platform performance.", icon: BarChart3, href: "/admin/analytics" },
    { title: "College Resources", description: "Manage external resources and links for your students.", icon: ExternalLink, href: "/admin/resources" },
    { title: "Admin Profile", description: "View and manage your profile details.", icon: UserCog, href: "/admin/profile" },
    { title: "System Settings", description: "Configure platform settings and integrations.", icon: SlidersHorizontal, href: "/admin/settings" },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      if (userProfile?.collegeId) {
        setIsLoadingStats(true);
        try {
          // Fetch student count
          const usersRef = collection(db, 'users');
          const studentQuery = query(usersRef, where('collegeId', '==', userProfile.collegeId), where('role', '==', 'student'));
          const studentSnapshot = await getDocs(studentQuery);
          setStudentCount(studentSnapshot.size);

          // Fetch active courses count (programming languages in the college)
          const languagesRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
          const languagesSnapshot = await getDocs(languagesRef);
          setActiveCoursesCount(languagesSnapshot.size);

        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
          toast({
            title: "Error",
            description: "Could not load dashboard statistics.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingStats(false);
        }
      } else if (userProfile === null) { // If user is explicitly null (logged out)
        setIsLoadingStats(false);
      }
    };

    if (userProfile !== undefined) { // Only fetch if userProfile is determined (not undefined initial state)
        fetchStats();
    }
  }, [userProfile, toast]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header and Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline text-foreground">Admin Dashboard</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Welcome back, {userProfile?.fullName || 'Admin'}! Manage college workspace settings and labs.</p>
        </div>
        
        <Button asChild size="sm" variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/10 hover:bg-amber-500/10 h-8 rounded-lg text-xs font-bold w-fit">
          <Link href="/admin/seed" className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" /> Database Seeder
          </Link>
        </Button>
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono">Total Students</span>
            {isLoadingStats ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary mt-1" />
            ) : (
              <h3 className="text-2xl font-extrabold text-foreground">{studentCount ?? 0}</h3>
            )}
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono">Active Subjects</span>
            {isLoadingStats ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary mt-1" />
            ) : (
              <h3 className="text-2xl font-extrabold text-foreground">{activeCoursesCount ?? 0}</h3>
            )}
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden col-span-2 md:col-span-1">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono">College Portal</span>
            <h3 className="text-sm font-extrabold text-foreground truncate max-w-[150px] sm:max-w-[200px] md:max-w-[180px]">{userProfile?.collegeName || 'Portal Admin'}</h3>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 px-1">
          <Settings className="w-4 h-4 text-primary" />
          Management Portal
        </h2>
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardItems.sort((a,b) => a.title.localeCompare(b.title)).map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.title} 
                href={item.href}
                className="group border border-border/45 bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300 p-5 rounded-2xl shadow-sm hover:shadow-md flex items-start gap-4 cursor-pointer relative overflow-hidden"
              >
                <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="space-y-1 pr-4 min-w-0">
                  <h3 className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
                </div>
                
                <div className="absolute top-4 right-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
       
      {/* Bottom Section */}
      <Card className="shadow-md border-border/40">
        <CardHeader className="py-4 px-5">
          <CardTitle className="text-base font-bold font-headline">Recent System Activities</CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-5 pb-5">
          <p className="text-xs text-muted-foreground font-sans">No recent platform occurrences captured yet. Student logins, course additions, and resource uploads will display here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
