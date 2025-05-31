
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Settings, BookOpen, UserCog } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const dashboardItems = [
    { title: "User Management", description: "View and manage student and faculty accounts.", icon: Users, href: "/admin/users" },
    { title: "Course Management", description: "Create, edit, and organize courses and labs.", icon: BookOpen, href: "/admin/courses" },
    { title: "Platform Analytics", description: "Track usage statistics and platform performance.", icon: BarChart3, href: "/admin/analytics" },
    { title: "Admin Profile", description: "View and manage your profile details.", icon: UserCog, href: "/admin/profile" },
    { title: "System Settings", description: "Configure platform settings and integrations.", icon: Settings, href: "/admin/settings" },
  ];

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Admin Dashboard</CardTitle>
          <CardDescription>Welcome, Admin! Manage Campus Codex efficiently from here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is your central hub for overseeing all aspects of the Campus Codex platform. Use the sections below to navigate to different management areas.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {dashboardItems.map((item) => (
          <Card key={item.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center space-x-3 pb-2">
              <item.icon className="w-8 h-8 text-primary" />
              <CardTitle className="text-xl font-headline">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <Button variant="outline" asChild className="w-full border-primary text-primary hover:bg-primary/10">
                <Link href={item.href}>Go to {item.title}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
       {/* Placeholder sections for future implementation */}
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
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span>Total Students:</span> <span className="font-semibold">0</span></div>
            <div className="flex justify-between"><span>Active Labs:</span> <span className="font-semibold">0</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
