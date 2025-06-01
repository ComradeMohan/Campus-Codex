
import type { NavItem, FeatureItem } from '@/types';
import { Code, FileText, BarChart3, Settings, Linkedin, Twitter, Github, BookOpen, ShieldCheck } from 'lucide-react';

export const siteConfig = {
  name: "Campus Codex",
  description: "A learning platform for college students, offering interactive coding labs and online assessments to master programming languages.",
  url: "https://campuscoding.example.com", // Replace with your actual domain
  ogImage: "https://campuscoding.example.com/og.jpg", // Replace with your actual OG image
  links: {
    twitter: "https://comrademohan.rf.gd/",
    github: "https://github.com/ComradeMohan/Campus-Codex",
    linkedin: "https://www.linkedin.com/in/mmohanreddy/",
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
    contactEmail: "mohanreddy3539@gmail.com",
    address: "Chennai, Tamilnadu",
    socialLinks: [
      { icon: Twitter, href: "https://twitter.com/example", name: "Twitter" },
      { icon: Github, href: "https://github.com/example", name: "GitHub" },
      { icon: Linkedin, href: "https://linkedin.com/company/example", name: "LinkedIn" },
    ],
  },
  // Firebase configuration (placeholders - replace with your actual config)
  firebaseConfig: {
    apiKey: "AIzaSyCVZJ9HsosLnGNtWofpB0UDYXGzhjJonYI",
  authDomain: "tester-c330a.firebaseapp.com",
  projectId: "tester-c330a",
  storageBucket: "tester-c330a.firebasestorage.app",
  messagingSenderId: "457957223942",
  appId: "1:457957223942:web:26a2d88dde5fb12b839d87"
  },
};

const fbConfig = siteConfig.firebaseConfig;
export const isFirebasePlaceholdersUsed =
  !fbConfig.apiKey || fbConfig.apiKey === "YOUR_API_KEY" ||
  !fbConfig.authDomain || fbConfig.authDomain === "YOUR_AUTH_DOMAIN" ||
  !fbConfig.projectId || fbConfig.projectId === "YOUR_PROJECT_ID";
