import type { FeatureItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureCardProps {
  feature: FeatureItem;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <Card className="group h-full border border-border/40 shadow-sm hover:shadow-md hover:border-primary/20 hover-glow transition-all duration-300 ease-out bg-card transform hover:-translate-y-1.5 rounded-2xl">
      <CardHeader className="flex flex-row items-center space-x-4 pb-3">
        <div className="p-2.5 rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-all duration-300 ease-out">
          <feature.icon className="w-6 h-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
        </div>
        <CardTitle className="text-lg font-bold font-headline tracking-tight">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
      </CardContent>
    </Card>
  );
}

