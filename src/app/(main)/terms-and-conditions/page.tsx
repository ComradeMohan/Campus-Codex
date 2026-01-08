
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Campus Codex',
  description: 'Terms and Conditions for using Campus Codex.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
           <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the Campus Codex website (the "Service") operated by us.
          </p>
          <section>
            <h2 className="text-2xl font-semibold">1. Accounts</h2>
            <p>
              When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">2. User Conduct</h2>
            <p>
              You agree not to use the Service to post or transmit any material which is threatening, defamatory, obscene, indecent, or in violation of any law. You are responsible for any content you post.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">3. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are and will remain the exclusive property of Campus Codex and its licensors.
            </p>
          </section>
           <section>
            <h2 className="text-2xl font-semibold">4. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
