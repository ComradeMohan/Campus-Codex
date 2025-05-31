import type { FeatureItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureCardProps {
  feature: FeatureItem;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <Card className="h-full shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out bg-card transform hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center space-x-4 pb-2">
        <feature.icon className="w-10 h-10 text-primary" />
        <CardTitle className="text-xl font-semibold font-headline">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{feature.description}</p>
      </CardContent>
    </Card>
  );
}
