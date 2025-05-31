import { AdminRegisterForm } from '@/components/auth/AdminRegisterForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register Your College | Campus Codex',
  description: 'College administrator registration for Campus Codex.',
};

export default function AdminRegisterPage() {
  return <AdminRegisterForm />;
}
