import { AICodeAssistant } from '@/components/AICodeAssistant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TerminalSquare, BookCopy, Zap } from 'lucide-react';
import Image from 'next/image';

export default function StudentCodingLabsPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2">
             <Image 
              src="https://placehold.co/800x600.png" 
              alt="Student coding in a lab" 
              width={800} 
              height={600} 
              className="object-cover h-64 w-full md:h-full"
              data-ai-hint="coding learning student"
            />
          </div>
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-3xl font-headline text-primary flex items-center">
                <TerminalSquare className="w-8 h-8 mr-3" />
                Your Coding Labs
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                Welcome to your personal coding playground. Practice, experiment, and build with the help of our AI assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-muted-foreground mb-6">
                Select a lab, start coding, and don&apos;t hesitate to use the AI Code Assistant below to overcome challenges and learn faster.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                  <BookCopy className="w-6 h-6 text-primary" />
                  <span className="font-medium">Access All Labs</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                  <Zap className="w-6 h-6 text-accent" />
                  <span className="font-medium">AI-Powered Learning</span>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      {/* Placeholder for Lab Selection or current lab view */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Current Lab / Lab Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This area will display your current coding lab environment or a list of available labs to choose from.
            For now, you can use the AI Code Assistant below independently.
          </p>
          {/* Example lab items could go here */}
        </CardContent>
      </Card>
      
      <AICodeAssistant />
    </div>
  );
}
