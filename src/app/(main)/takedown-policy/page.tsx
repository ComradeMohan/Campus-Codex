
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Takedown Policy | Campus Codex',
  description: 'Takedown Policy for Campus Codex.',
};

export default function TakedownPolicyPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Takedown Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
           <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            Campus Codex respects the intellectual property rights of others and expects its users to do the same. This policy outlines the procedure for requesting the removal of content that you believe infringes upon your copyright.
          </p>
          <section>
            <h2 className="text-2xl font-semibold">1. Reporting Copyright Infringement</h2>
            <p>
              If you are a copyright owner and you believe that any content on Campus Codex infringes your copyright, you may submit a notification pursuant to the Digital Millennium Copyright Act ("DMCA") by providing our Copyright Agent with the following information in writing:
            </p>
            <ul>
              <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
              <li>Identification of the copyrighted work claimed to have been infringed.</li>
              <li>Identification of the material that is claimed to be infringing and that is to be removed.</li>
              <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and email address.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">2. How to Submit a Notice</h2>
            <p>
              Please send your takedown notice to our designated agent at the following email address:
            </p>
             <a href="mailto:mohanreddy3539@gmail.com" className="text-primary hover:underline">mohanreddy3539@gmail.com</a>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">3. After Submission</h2>
            <p>
              Upon receipt of a valid DMCA notice, we will respond expeditiously to remove, or disable access to, the material that is claimed to be infringing.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
