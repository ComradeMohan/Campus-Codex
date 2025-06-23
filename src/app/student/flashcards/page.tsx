
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
      setFlashcards(result.flashcards);
      toast({
        title: 'Flashcards Generated!',
        description: `${result.flashcards.length} flashcards have been created from your content.`,
      });
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        title: 'Generation Failed',
        description: (error instanceof Error ? error.message : 'An unknown error occurred.') + ' Please try again.',
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
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-primary" />
            AI Flashcard Generator
          </CardTitle>
          <CardDescription>
            Create flashcards from text, PDFs, or YouTube videos to supercharge your learning.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="pdf">PDF Upload</TabsTrigger>
              <TabsTrigger value="youtube">YouTube Link</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-4">
              <Textarea
                placeholder="Paste your notes or any text content here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={10}
              />
            </TabsContent>
            <TabsContent value="pdf" className="mt-4 space-y-3">
              <Label htmlFor="pdf-upload">Upload a PDF document</Label>
              <div
                className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {pdfFile ? 'File selected:' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-primary">{pdfFile?.name}</p>
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
            <TabsContent value="youtube" className="mt-4 space-y-3">
              <Label htmlFor="youtube-url">YouTube Video URL</Label>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              </div>
               <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0"/>
                  <span>This feature is experimental. Works best with videos that have accurate, auto-generated or uploaded English captions.</span>
              </div>
            </TabsContent>
          </Tabs>
          <div className="mt-4 space-y-2">
             <Label htmlFor="topic-input">Topic (Optional)</Label>
             <Input 
                id="topic-input"
                placeholder="e.g., Python Data Structures, Quantum Physics Basics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
             />
             <p className="text-xs text-muted-foreground">Providing a topic helps the AI generate more relevant flashcards.</p>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full mt-6 text-base py-6">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Generate Flashcards
          </Button>
        </CardContent>
      </Card>

      {flashcards.length > 0 && (
        <div className="space-y-4">
            <h2 className="text-2xl font-headline font-semibold">Your Generated Flashcards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {flashcards.map((card, index) => (
                <div 
                    key={index} 
                    className="group [perspective:1000px] cursor-pointer"
                    onClick={() => toggleFlipCard(index)}
                >
                    <div className={cn(
                        "relative w-full h-52 rounded-xl shadow-lg transition-all duration-500 [transform-style:preserve-3d]",
                        flippedCardIds.has(index.toString()) && "[transform:rotateY(180deg)]"
                    )}>
                        {/* Front of Card */}
                        <div className="absolute inset-0 bg-card border rounded-xl flex items-center justify-center p-4 [backface-visibility:hidden]">
                           <p className="text-center font-medium text-card-foreground">{card.front}</p>
                        </div>
                        {/* Back of Card */}
                        <div className="absolute inset-0 bg-secondary border rounded-xl flex items-center justify-center p-4 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                             <p className="text-center text-sm text-secondary-foreground">{card.back}</p>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </div>
      )}
       <div className="text-center mt-8">
        <Button asChild variant="outline">
            <Link href="/student/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
