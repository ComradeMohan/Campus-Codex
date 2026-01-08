
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
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Admin Dashboard</CardTitle>
          <CardDescription>Welcome, {userProfile?.fullName || 'Admin'}! Manage Campus Codex efficiently from here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is your central hub for overseeing all aspects of the Campus Codex platform. Use the sections below to navigate to different management areas.</p>
        </CardContent>
      </Card>
      
      {/* Temporary Seeding Utility Button */}
       <Card className="border-amber-500 bg-amber-50">
        <CardHeader>
            <CardTitle className="flex items-center text-amber-800"><Database className="mr-2 h-5 w-5" /> Temporary DB Seed Utility</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-amber-700 mb-3">Click the button below to seed the database with the provided Java questions. This is a one-time operation.</p>
            <Button asChild variant="secondary">
                <Link href="/admin/seed">Go to Seeding Page</Link>
            </Button>
        </CardContent>
       </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dashboardItems.sort((a,b) => a.title.localeCompare(b.title)).map((item) => (
          <Card key={item.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center space-x-3 pb-2">
              <item.icon className="w-8 h-8 text-primary" />
              <CardTitle className="text-xl font-headline">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground h-16 line-clamp-3">{item.description}</p>
              <Button variant="outline" asChild className="w-full border-primary text-primary hover:bg-primary/10">
                <Link href={item.href}>Go to {item.title}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
       
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activity to display yet.</p>
            {/* List recent registrations, test submissions etc. */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats for {userProfile?.collegeName || 'Your College'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingStats ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading stats...</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between"><span>Total Students:</span> <span className="font-semibold">{studentCount ?? 'N/A'}</span></div>
                <div className="flex justify-between"><span>Active Main Subjects/Languages:</span> <span className="font-semibold">{activeCoursesCount ?? 'N/A'}</span></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
