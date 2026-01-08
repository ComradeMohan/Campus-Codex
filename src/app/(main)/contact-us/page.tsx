
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Campus Codex',
  description: 'Get in touch with the Campus Codex team.',
};

export default function ContactUsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
          <p>
            We'd love to hear from you! Whether you have a question about features, trials, a bug report, or anything else, our team is ready to answer all your questions.
          </p>
          
          <section>
            <h2 className="text-2xl font-semibold">General Inquiries</h2>
            <p>For general questions, please email us at:</p>
            <a href="mailto:mohanreddy3539@gmail.com" className="text-primary hover:underline">mohanreddy3539@gmail.com</a>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Support</h2>
            <p>If you are experiencing technical issues or need help with your account, please contact our support team:</p>
             <a href="mailto:mohanreddy3539@gmail.com" className="text-primary hover:underline">mohanreddy3539@gmail.com</a>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Business & Partnerships</h2>
            <p>For business inquiries and partnership opportunities, please reach out to:</p>
             <a href="mailto:mohanreddy3539@gmail.com" className="text-primary hover:underline">mohanreddy3539@gmail.com</a>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
