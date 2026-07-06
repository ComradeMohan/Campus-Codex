'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Quote, Star, School, Award, GraduationCap } from "lucide-react";

const testimonials = [
  {
    quote: "Campus Codex has revolutionized how our students learn coding. The interactive labs and AI assistance are game-changers!",
    name: "Dr. Eleanor Vance",
    role: "Dean of Engineering",
    institution: "Tech University",
    avatarFallback: "EV",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    institutionIcon: School,
  },
  {
    quote: "The platform's ease of use and comprehensive analytics have made managing our programming courses incredibly efficient.",
    name: "Prof. Ben Carter",
    role: "Lead CS Instructor",
    institution: "City College",
    avatarFallback: "BC",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    institutionIcon: Award,
  },
  {
    quote: "As a student, the sandbox and practice labs are fantastic. I feel much more confident in my coding skills now.",
    name: "Aisha Khan",
    role: "Software Engineering Student",
    institution: "Student Voice",
    avatarFallback: "AK",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    institutionIcon: GraduationCap,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32 bg-secondary/20 dark:bg-background/40 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-accent/5 blur-[120px] pointer-events-none"></div>
      
      <div className="container px-4 md:px-6 relative z-10">
        <div className="text-center mb-20 max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-semibold">
            Success Stories
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl font-headline text-foreground">
            Trusted by <span className="text-gradient">Leading Institutions</span>
          </h2>
          <p className="text-lg text-muted-foreground md:text-xl leading-relaxed">
            Hear what educators and students are saying about their journey with Campus Codex.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => {
            const InstIcon = testimonial.institutionIcon;
            return (
              <div 
                key={index}
                className="animate-in fade-in slide-in-from-bottom-8 duration-700"
                style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}
              >
                <Card className="relative overflow-hidden h-full border border-border/40 hover:border-primary/20 shadow-sm hover:shadow-xl hover-glow transition-all duration-300 ease-out bg-card/60 backdrop-blur-sm flex flex-col justify-between rounded-2xl transform hover:-translate-y-2 group">
                  {/* Glowing top line on hover */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <CardHeader className="pb-4 relative">
                    {/* Background quote mark watermark */}
                    <Quote className="absolute top-4 right-6 h-12 w-12 text-primary/5 group-hover:text-primary/10 transition-colors duration-300 pointer-events-none" />
                    
                    {/* Star Rating */}
                    <div className="flex gap-0.5 mb-4 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current stroke-current" />
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border border-primary/10 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 text-primary text-sm font-bold">
                          {testimonial.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <CardTitle className="text-base font-bold font-headline leading-none text-foreground">{testimonial.name}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-normal">{testimonial.role}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-grow pb-6 pt-2">
                    <p className="text-muted-foreground text-sm leading-relaxed italic">
                      "{testimonial.quote}"
                    </p>
                  </CardContent>

                  <div className="px-6 pb-6 pt-4 border-t border-border/40 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${testimonial.badgeColor}`}>
                      <InstIcon className="h-3.5 w-3.5" />
                      {testimonial.institution}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">Verified Member</span>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
