
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimer | Campus Codex',
  description: 'Disclaimer for Campus Codex.',
};

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-4">
           <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            The information provided by Campus Codex ("we," "us," or "our") on this website is for general informational and educational purposes only. All information on the site is provided in good faith, however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the site.
          </p>
          <section>
            <h2 className="text-2xl font-semibold">Educational Purposes Only</h2>
            <p>
              Campus Codex is a software project developed for educational and demonstration purposes. While we strive to provide accurate and functional code execution, AI assistance, and learning materials, we cannot guarantee the correctness of every piece of information or the output of every tool. The platform should be used as a supplementary learning aid and not as a sole source of academic information or for mission-critical applications.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">External Links Disclaimer</h2>
            <p>
              The site may contain (or you may be sent through the site) links to other websites or content belonging to or originating from third parties. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">No Professional Advice</h2>
            <p>
              The information is not intended to be a substitute for professional advice. Always seek the advice of a qualified professional with any questions you may have regarding a particular subject. Reliance on any information provided by this website is solely at your own risk.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
