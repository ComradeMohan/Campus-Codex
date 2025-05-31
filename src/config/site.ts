
import type { NavItem, FeatureItem } from '@/types';
import { Code, FileText, BarChart3, Settings, Linkedin, Twitter, Github, BookOpen, ShieldCheck } from 'lucide-react';

export const siteConfig = {
  name: "Campus Codex",
  description: "A learning platform for college students, offering interactive coding labs and online assessments to master programming languages.",
  url: "https://campuscoding.example.com", // Replace with your actual domain
  ogImage: "https://campuscoding.example.com/og.jpg", // Replace with your actual OG image
  links: {
    twitter: "https://twitter.com/example",
    github: "https://github.com/example",
    linkedin: "https://linkedin.com/company/example",
  },
  navItems: [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "Register", href: "/register/student" }, // Default to student registration
    { label: "Login", href: "/login" },
  ] as NavItem[],
  featureItems: [
    {
      icon: BookOpen,
      title: "Student Practice Labs",
      description: "Hands-on coding environments for students to practice and master programming skills with AI assistance.",
    },
    {
      icon: FileText,
      title: "Online Test Module",
      description: "Secure and scalable platform for conducting online tests and assessments with automated grading.",
    },
    {
      icon: BarChart3,
      title: "Faculty Analytics",
      description: "Insightful analytics for faculty to track student progress, identify learning gaps, and improve teaching.",
    },
    {
      icon: ShieldCheck,
      title: "Admin Management",
      description: "Comprehensive tools for college administrators to manage courses, users, and institutional settings.",
    },
  ] as FeatureItem[],
  footer: {
    contactEmail: "support@campuscoding.example.com",
    address: "123 University Drive, Innovation City, ST 12345",
    socialLinks: [
      { icon: Twitter, href: "https://twitter.com/example", name: "Twitter" },
      { icon: Github, href: "https://github.com/example", name: "GitHub" },
      { icon: Linkedin, href: "https://linkedin.com/company/example", name: "LinkedIn" },
    ],
  },
  // Firebase configuration (placeholders - replace with your actual config)
  firebaseConfig: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
  },
};
