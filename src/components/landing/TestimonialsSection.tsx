import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

const testimonials = [
  {
    quote: "Campus Codex has revolutionized how our students learn coding. The interactive labs and AI assistance are game-changers!",
    name: "Dr. Eleanor Vance",
    title: "Dean of Engineering, Tech University",
    avatarSrc: "https://placehold.co/100x100.png",
    avatarFallback: "EV",
    companyLogoSrc: "https://placehold.co/120x40.png?text=Tech+U",
    dataAiHint: "university logo"
  },
  {
    quote: "The platform's ease of use and comprehensive analytics have made managing our programming courses incredibly efficient.",
    name: "Prof. Ben Carter",
    title: "Lead CS Instructor, City College",
    avatarSrc: "https://placehold.co/100x100.png",
    avatarFallback: "BC",
    companyLogoSrc: "https://placehold.co/120x40.png?text=City+College",
    dataAiHint: "college logo"
  },
  {
    quote: "As a student, the sandbox and practice labs are fantastic. I feel much more confident in my coding skills now.",
    name: "Aisha Khan",
    title: "Software Engineering Student",
    avatarSrc: "https://placehold.co/100x100.png",
    avatarFallback: "AK",
    companyLogoSrc: "https://placehold.co/120x40.png?text=Student+Voice",
    dataAiHint: "abstract icon"
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30 dark:bg-background overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Trusted by Leading Institutions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
            Hear what educators and students are saying about Campus Codex.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${150 * index}ms`, animationFillMode: 'backwards' }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out bg-card flex flex-col h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={testimonial.avatarSrc} alt={testimonial.name} data-ai-hint="person face" />
                      <AvatarFallback>{testimonial.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg font-semibold">{testimonial.name}</CardTitle>
                      <CardDescription className="text-xs">{testimonial.title}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                    <p className="leading-relaxed">"{testimonial.quote}"</p>
                  </blockquote>
                </CardContent>
                <CardFooter className="pt-4">
                  <Image 
                    src={testimonial.companyLogoSrc} 
                    alt={`${testimonial.name}'s institution logo`} 
                    width={100} 
                    height={35}
                    className="object-contain opacity-70"
                    data-ai-hint={testimonial.dataAiHint}
                  />
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
