import { LoginForm } from '@/components/auth/LoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Campus Codex',
  description: 'Login to Campus Codex.',
};

export default function LoginPage() {
  return <LoginForm />;
}
