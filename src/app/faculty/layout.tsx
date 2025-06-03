
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

interface FacultyLayoutProps {
  children: React.ReactNode;
}

export default function FacultyLayout({ children }: FacultyLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['faculty']}>
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
