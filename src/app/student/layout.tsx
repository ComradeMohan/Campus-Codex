
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar'; 
import { Footer } from '@/components/layout/Footer';
import { NotificationPermissionHandler } from '@/components/notifications/NotificationPermissionHandler';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <NotificationPermissionHandler />
      <div className="flex flex-col min-h-screen">
        <Navbar /> {/* Or StudentNavbar */}
        <main className="flex-grow container py-8">
          {children}
        </main>
        <Footer /> {/* Or StudentFooter */}
      </div>
    </ProtectedRoute>
  );
}
