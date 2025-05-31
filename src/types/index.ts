
import type { LucideIcon } from 'lucide-react';
import type { Timestamp, FieldValue } from 'firebase/firestore';

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
  collegeId?: string; // For students and admins, linking to a college
  phoneNumber?: string;
  isEmailVerified: boolean;
}

export interface College {
  id: string;
  name: string;
  adminEmail: string;
}

export interface ProgrammingLanguage {
  id: string;
  name: string;
  description?: string;
  iconName?: string; // To store the name of a Lucide icon
  createdAt: Timestamp | FieldValue;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  // score?: number; // Future consideration
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  languageId: string; // The ID of the ProgrammingLanguage
  languageName: string; // Name of the language, denormalized for easier display
  questionText: string;
  difficulty: QuestionDifficulty;
  maxScore: number;
  sampleInput?: string;
  sampleOutput?: string;
  solution?: string;
  testCases: TestCase[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export type OnlineTestStatus = 'draft' | 'published' | 'archived';

export interface OnlineTest {
  id: string;
  languageId: string;
  languageName: string;
  title: string;
  description?: string;
  durationMinutes: number;
  questionIds: string[];
  questionsSnapshot: Pick<Question, 'id' | 'questionText' | 'difficulty' | 'maxScore'>[]; // Store a snapshot of key question details
  totalScore: number;
  status: OnlineTestStatus;
  scheduledAt?: Timestamp; // Optional: for future scheduling
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  createdBy: string; // UID of the admin who created it
}


export interface EnrolledLanguageProgress {
  languageId: string;
  languageName: string;
  iconName?: string;
  enrolledAt: Timestamp | FieldValue;
  currentScore: number;
  completedQuestions: {
    [questionId: string]: {
      scoreAchieved: number;
      completedAt: Timestamp | FieldValue;
    };
  };
}
