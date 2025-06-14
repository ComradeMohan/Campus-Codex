
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

interface MainAdminLayoutProps {
  children: React.ReactNode;
}

export default function MainAdminLayout({ children }: MainAdminLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['super-admin']}>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container py-8">
          {children}
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
