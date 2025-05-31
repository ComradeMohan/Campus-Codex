import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar'; // Assuming a shared navbar, or create admin-specific one
import { Footer } from '@/components/layout/Footer'; // Assuming a shared footer

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex flex-col min-h-screen">
        <Navbar /> {/* Or AdminNavbar */}
        <main className="flex-grow container py-8">
          {children}
        </main>
        <Footer /> {/* Or AdminFooter */}
      </div>
    </ProtectedRoute>
  );
}
