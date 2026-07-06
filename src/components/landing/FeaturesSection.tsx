'use client';

import { siteConfig } from '@/config/site';
import { FeatureCard } from './FeatureCard';

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>

      <div className="container px-4 md:px-6 relative z-10">
        <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl font-headline text-foreground">
            Why Choose <span className="text-gradient">{siteConfig.name}</span>?
          </h2>
          <p className="text-lg text-muted-foreground md:text-xl leading-relaxed">
            Explore the powerful features designed to enhance learning, streamline assessments, and provide valuable insights.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.featureItems.map((feature, index) => (
            <div key={feature.title}>
              <FeatureCard feature={feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

