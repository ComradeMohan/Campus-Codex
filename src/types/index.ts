import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type SocialLink = {
  icon: LucideIcon;
  href: string;
  name: string;
};

export type UserRole = 'student' | 'admin';

export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  collegeName?: string; // For admins
  registrationNumber?: string; // For students
  collegeId?: string; // For students, linking to a college
  phoneNumber?: string;
  isEmailVerified: boolean;
}

export interface College {
  id: string;
  name: string;
  adminEmail: string;
}
