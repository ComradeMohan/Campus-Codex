
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Send, Bot, User, Sparkles, X } from 'lucide-react';
import { studentLabAssistant, type StudentLabAssistantInput } from '@/ai/flows/student-lab-assistant';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


interface LabAIChatAssistantProps {
  currentLanguageName: string;
  currentQuestionText?: string;
  getCurrentCodeSnippet?: () => string; // Function to get the latest code from editor
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function LabAIChatAssistant({
  currentLanguageName,
  currentQuestionText,
  getCurrentCodeSnippet,
  isOpen,
  onToggle
}: LabAIChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);
  
  // Hide on mobile by default as per original request's intent, parent controls actual rendering.
  // This component assumes it won't be rendered on mobile if this hook returns true.
  if (isMobile && isOpen) { 
    onToggle(); // If somehow opened on mobile, try to close it.
    return null; 
  }


  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const codeSnippet = getCurrentCodeSnippet ? getCurrentCodeSnippet() : undefined;
      const input: StudentLabAssistantInput = {
        currentLanguage: currentLanguageName,
        currentQuestionText: currentQuestionText,
        currentCodeSnippet: codeSnippet,
        studentDoubt: newUserMessage.content,
      };
      const result = await studentLabAssistant(input);
      const assistantMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.aiResponse };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      toast({
        title: 'AI Assistant Error',
        description: 'Could not get a response from the AI. Please try again.',
        variant: 'destructive',
      });
       const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I couldn't process your request right now." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className={cn(
        "fixed top-1/2 right-4 transform -translate-y-1/2 z-50 shadow-2xl rounded-lg",
        "w-[350px] h-[70vh] max-h-[600px] flex flex-col bg-card",
        "md:w-[400px] md:h-[75vh] md:max-h-[700px]",
        "transition-all duration-300 ease-in-out",
        isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
    )}>
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
        <CardTitle className="text-md font-semibold flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-primary" />
          AI Lab Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
            <X className="h-4 w-4"/>
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full p-3">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex items-start gap-2.5 text-sm", msg.role === 'user' ? 'justify-end' : '')}>
                {msg.role === 'assistant' && <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />}
                <div
                  className={cn(
                    "p-2.5 rounded-lg max-w-[85%]",
                    msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                  )}
                >
                   <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
                 {msg.role === 'user' && <User className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2.5 text-sm">
                <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="p-2.5 rounded-lg bg-muted rounded-bl-none">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-3 border-t">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage();}} className="flex w-full items-center gap-2">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask a question about your code..."
            rows={1}
            className="flex-1 resize-none min-h-[40px] max-h-[100px] text-sm py-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !userInput.trim()} className="h-9 w-9">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
