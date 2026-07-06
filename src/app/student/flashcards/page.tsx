
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, UploadCloud, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { generateFlashcards, type Flashcard } from '@/ai/flows/flashcard-generator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function StudentFlashcardGeneratorPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [flippedCardIds, setFlippedCardIds] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      setPdfFile(null);
      toast({
        title: 'Invalid File Type',
        description: 'Please select a PDF file.',
        variant: 'destructive',
      });
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    let inputType: 'text' | 'pdf' | 'youtube' | null = null;
    let content: string | undefined = undefined;

    switch (activeTab) {
      case 'text':
        if (!textInput.trim()) {
          toast({ title: 'Error', description: 'Please enter some text.', variant: 'destructive' });
          return;
        }
        inputType = 'text';
        content = textInput;
        break;
      case 'pdf':
        if (!pdfFile) {
          toast({ title: 'Error', description: 'Please select a PDF file.', variant: 'destructive' });
          return;
        }
        inputType = 'pdf';
        content = await fileToDataUri(pdfFile);
        break;
      case 'youtube':
        if (!youtubeUrl.trim() || !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(youtubeUrl)) {
           toast({ title: 'Error', description: 'Please enter a valid YouTube URL.', variant: 'destructive' });
           return;
        }
        inputType = 'youtube';
        content = youtubeUrl;
        break;
    }
    
    if (!inputType || !content) return;

    setIsLoading(true);
    setFlashcards([]);
    setFlippedCardIds(new Set());

    try {
      const result = await generateFlashcards({
        inputType,
        content,
        topic: topic || undefined,
      });

      if (result.error) {
        toast({
          title: 'Generation Failed',
          description: result.error,
          variant: 'destructive',
        });
        setFlashcards([]);
      } else if (result.flashcards && result.flashcards.length > 0) {
        setFlashcards(result.flashcards);
        toast({
          title: 'Flashcards Generated!',
          description: `${result.flashcards.length} flashcards have been created from your content.`,
        });
      } else {
         toast({
          title: 'No Flashcards Generated',
          description: 'The AI could not generate any flashcards from the provided content.',
          variant: 'default',
        });
      }
    } catch (error) { // This will now catch unexpected system/network errors
      console.error('Error generating flashcards:', error);
      toast({
        title: 'An Unexpected Error Occurred',
        description: (error instanceof Error ? error.message : 'The request failed. Please check your connection and try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlipCard = (index: number) => {
    setFlippedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index.toString())) {
        newSet.delete(index.toString());
      } else {
        newSet.add(index.toString());
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="border border-border/40 bg-card/60 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-foreground flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-primary" />
              AI Flashcard Generator
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1.5 font-sans">
              Create custom flashcards from text notes, uploaded PDFs, or YouTube lectures using advanced AI.
            </p>
          </div>
          <Button asChild variant="outline" className="text-[11px] h-8 px-3 rounded-lg font-bold border-border/60 hover:bg-primary/5 hover:text-primary transition-colors self-start sm:self-auto shrink-0">
            <Link href="/student/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Generator Card */}
      <Card className="border border-border/40 bg-card/60 backdrop-blur-sm shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-secondary/30 p-1 rounded-xl">
              <TabsTrigger value="text" className="rounded-lg text-xs md:text-sm font-semibold transition-all">
                <span className="hidden md:inline">Text Input</span>
                <span className="md:hidden">Text</span>
              </TabsTrigger>
              <TabsTrigger value="pdf" className="rounded-lg text-xs md:text-sm font-semibold transition-all">
                <span className="hidden md:inline">PDF Upload</span>
                <span className="md:hidden">PDF</span>
              </TabsTrigger>
              <TabsTrigger value="youtube" className="rounded-lg text-xs md:text-sm font-semibold transition-all">
                <span className="hidden md:inline">YouTube Link</span>
                <span className="md:hidden">YouTube</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="mt-4">
              <Textarea
                placeholder="Paste your study notes, textbook chapters, or programming document snippets here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={8}
                className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 text-sm p-4 transition-all"
              />
            </TabsContent>
            
            <TabsContent value="pdf" className="mt-4 space-y-3">
              <Label htmlFor="pdf-upload" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload a PDF document</Label>
              <div
                className="flex items-center justify-center w-full p-8 border-2 border-dashed border-border/60 hover:border-primary/30 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <UploadCloud className="w-10 h-10 mx-auto text-primary/60 animate-pulse-subtle" />
                  <p className="mt-2 text-sm font-bold text-foreground">
                    {pdfFile ? 'PDF Selected' : 'Drag & drop your PDF document'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pdfFile ? 'Click to change file' : 'or click to browse local files'}
                  </p>
                  {pdfFile && (
                    <p className="mt-3 text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 w-fit mx-auto">
                      {pdfFile.name}
                    </p>
                  )}
                </div>
              </div>
              <Input
                id="pdf-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
            </TabsContent>
            
            <TabsContent value="youtube" className="mt-4 space-y-4">
              <Label htmlFor="youtube-url" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">YouTube Video URL</Label>
              <div className="flex items-center gap-3 bg-background/50 border border-border/50 rounded-xl px-4 py-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                <LinkIcon className="h-5 w-5 text-muted-foreground/60 shrink-0" />
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10 py-0"
                />
              </div>
              <div className="p-3.5 bg-amber-500/5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/10 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>This feature works best with educational videos or lectures that have English subtitles/captions enabled.</span>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-2">
             <Label htmlFor="topic-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Topic (Optional)</Label>
             <Input 
                id="topic-input"
                placeholder="e.g., Python Data Structures, React hooks, or Lecture 1"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 py-5 px-4 text-sm"
             />
             <p className="text-[10px] text-muted-foreground font-sans">Providing a topic helps the AI generate more relevant, context-focused flashcards.</p>
          </div>
          
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full mt-6 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 rounded-xl py-6 text-sm font-bold flex items-center justify-center">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Flashcards
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {flashcards.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/40">
            <h2 className="text-xl md:text-2xl font-bold font-headline flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generated Flashcards ({flashcards.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {flashcards.map((card, index) => (
                <div 
                  key={index} 
                  className="group [perspective:1000px] cursor-pointer"
                  onClick={() => toggleFlipCard(index)}
                >
                  <div className={cn(
                    "relative w-full h-60 rounded-2xl shadow-lg transition-all duration-500 [transform-style:preserve-3d] select-none",
                    flippedCardIds.has(index.toString()) && "[transform:rotateY(180deg)]"
                  )}>
                    {/* Front of Card */}
                    <div className="absolute inset-0 bg-card border rounded-2xl flex flex-col justify-between p-6 [backface-visibility:hidden] shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Question</span>
                      <p className="text-center font-bold text-foreground text-sm leading-relaxed my-auto">{card.front}</p>
                      <span className="text-[9px] text-muted-foreground text-center font-mono">Click to reveal answer</span>
                    </div>
                    {/* Back of Card */}
                    <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl flex flex-col justify-between p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-md hover:shadow-xl transition-all duration-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">Answer</span>
                      <p className="text-center text-xs font-semibold text-foreground leading-relaxed my-auto">{card.back}</p>
                      <span className="text-[9px] text-primary/80 text-center font-mono">Click to view question</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
}
