
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

export type UserRole = 'student' | 'admin' | 'faculty';

export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  collegeName?: string;
  registrationNumber?: string;
  collegeId?: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  managedLanguageIds?: string[];
}

export interface College {
  id: string;
  name: string;
  adminEmail: string;
  hasUnreadFeedback?: boolean;
}

export interface ProgrammingLanguage {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  createdAt: Timestamp | FieldValue;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  languageId: string;
  languageName: string;
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
export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface EnrollmentRequest {
  studentUid: string;
  studentName: string;
  studentEmail?: string;
  requestedAt: Timestamp | FieldValue;
  status: EnrollmentRequestStatus;
  rejectionReason?: string;
  processedBy?: string; // UID of faculty or admin
  processedAt?: Timestamp | FieldValue;
}

export interface OnlineTest {
  id: string;
  languageId: string;
  languageName: string;
  title: string;
  description?: string;
  durationMinutes: number;
  questionIds: string[];
  questionsSnapshot: Pick<Question, 'id' | 'questionText' | 'difficulty' | 'maxScore'>[];
  totalScore: number;
  status: OnlineTestStatus;
  scheduledAt?: Timestamp;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  createdBy: string;
  isFacultyCreated?: boolean;
  facultyId?: string;
  enrollmentRequests?: EnrollmentRequest[];
  approvedStudentUids?: string[];
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
      submittedCode: string;
      solvedWithLanguage?: string;
    };
  };
}

export interface SavedProgram {
  id: string;
  userId: string;
  title: string;
  code: string;
  languageName: string;
  languageId: string;
  iconName?: string;
  lastInput?: string;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
}

export interface Feedback {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  collegeId: string;
  feedbackText: string;
  createdAt: Timestamp | FieldValue;
  isRead: boolean;
}

export interface Course {
  id: string;
  name: string;
  languageId: string;
  languageName: string;
  facultyId: string;
  facultyName: string;
  collegeId: string;
  strength: number;
  description?: string;
  enrolledStudentUids?: string[];
  enrollmentRequests?: EnrollmentRequest[];
  assignedQuestionIds?: string[]; // Added for assigning questions to course
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

