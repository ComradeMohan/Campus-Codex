import { siteConfig } from '@/config/site';
import { FeatureCard } from './FeatureCard';

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-background overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Why Choose <span className="text-primary">{siteConfig.name}</span>?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
            Explore the powerful features designed to enhance learning, streamline assessments, and provide valuable insights.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.featureItems.map((feature, index) => (
            <div 
              key={feature.title} 
              className="animate-in fade-in zoom-in-95 duration-700" 
              style={{ animationDelay: `${150 * (index + 1)}ms`, animationFillMode: 'backwards' }}
            >
              <FeatureCard feature={feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
