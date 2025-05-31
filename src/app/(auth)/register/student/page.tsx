import { StudentRegisterForm } from '@/components/auth/StudentRegisterForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Registration | Campus Codex',
  description: 'Student registration for Campus Codex.',
};

export default function StudentRegisterPage() {
  return <StudentRegisterForm />;
}
