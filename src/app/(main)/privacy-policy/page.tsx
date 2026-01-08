
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Campus Codex',
  description: 'Privacy Policy for Campus Codex.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            Your privacy is important to us. It is Campus Codex's policy to respect your privacy regarding any information we may collect from you across our website.
          </p>
          <section>
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p>
              Log data: When you visit our website, our servers may automatically log the standard data provided by your web browser. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details.
            </p>
             <p>
              Personal Information: We may ask for personal information, such as your name and email address, when you register for an account. This information is used to provide you with our services and to communicate with you.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">2. Use of Information</h2>
            <p>
              We use the collected information to operate, maintain, and provide the features and functionality of the service, as well as to communicate directly with you, such as to send you email messages and push notifications.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">3. Security</h2>
            <p>
              We take the security of your data seriously and use industry-standard measures to protect it. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
