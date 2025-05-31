'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2 } from 'lucide-react';
import { codeCompletion, type CodeCompletionInput } from '@/ai/flows/code-completion';
import { useToast } from '@/hooks/use-toast';

export function AICodeAssistant() {
  const [language, setLanguage] = useState('javascript');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [context, setContext] = useState('');
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!codeSnippet.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter some code to get a completion.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setCompletion('');
    try {
      const input: CodeCompletionInput = {
        language,
        codeSnippet,
        context: context || undefined,
      };
      const result = await codeCompletion(input);
      setCompletion(result.completion);
      toast({
        title: 'Code Completion Ready!',
        description: 'AI has suggested a completion for your code.',
      });
    } catch (error) {
      console.error('AI Code Completion Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get code completion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <Wand2 className="w-7 h-7 mr-2 text-primary" />
          AI Code Assistant
        </CardTitle>
        <CardDescription>
          Get AI-powered code completions and suggestions to speed up your development.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Programming Language</Label>
            <Input
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g., javascript, python"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="context">Context (Optional)</Label>
            <Input
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., function to sum array"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="codeSnippet">Your Code Snippet</Label>
          <Textarea
            id="codeSnippet"
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="Enter your code here..."
            rows={8}
            className="font-code text-sm"
          />
        </div>
        
        <Button onClick={handleSubmit} disabled={isLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Get Completion
        </Button>
        
        {completion && (
          <div className="space-y-2 pt-4 border-t mt-4">
            <Label htmlFor="aiCompletion">AI Suggested Completion</Label>
            <Textarea
              id="aiCompletion"
              value={completion}
              readOnly
              rows={6}
              className="bg-muted/50 font-code text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
