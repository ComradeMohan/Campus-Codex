
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MonacoCodeEditor } from '@/components/editor/MonacoCodeEditor';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Play, Trash2, PlusCircle, FileCode, Terminal, AlertTriangle, ClipboardType, ChevronRight, Coffee } from 'lucide-react';
import type { ProgrammingLanguage, SavedProgram } from '@/types';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

const getIconComponent = (iconName?: string): React.FC<React.SVGProps<SVGSVGElement>> => {
  if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
  }
  return FileCode; // Default icon
};

const getDefaultCodeForLanguage = (langName?: string): string => {
  if (!langName) return "// Select a language to start coding!";
  const lowerLang = langName.toLowerCase();
  if (lowerLang === 'python') {
    return `# Welcome to the Sandbox! Start coding in Python.\n\ndef main():\n    # Example: Read input\n    # name = input("Enter your name: ")\n    # print(f"Hello, {name}!")\n    print("Hello from Python Sandbox!")\n\nif __name__ == "__main__":\n    main()\n`;
  } else if (lowerLang === 'javascript') {
    return `// Welcome to the Sandbox! Start coding in JavaScript.\n// Use console.log() for output.\n\nfunction main() {\n    // Example: \n    // const name = "World";\n    // console.log(\`Hello, \${name}!\`);\n    console.log("Hello from JavaScript Sandbox!");\n}\n\nmain();\n`;
  } else if (lowerLang === 'java') {
    return `// Welcome to the Sandbox! Start coding in Java.\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Scanner scanner = new Scanner(System.in);\n        // System.out.println("Enter your name: ");\n        // String name = scanner.nextLine();\n        // System.out.println("Hello, " + name + "!");\n        // scanner.close();\n        System.out.println("Hello from Java Sandbox!");\n    }\n}\n`;
  }
  return `// Welcome to the Sandbox! Start coding in ${langName}.\n`;
};


export default function StudentSandboxPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [collegeLanguages, setCollegeLanguages] = useState<ProgrammingLanguage[]>([]);
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [currentProgramTitle, setCurrentProgramTitle] = useState('');
  const [currentCode, setCurrentCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage | null>(null);
  
  const [sampleInput, setSampleInput] = useState('');
  const [output, setOutput] = useState('');
  const [errorOutput, setErrorOutput] = useState('');
  const [activeTab, setActiveTab] = useState("input"); // "input", "output", "errors"

  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<SavedProgram | null>(null);

  // Fetch college languages and saved programs
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.uid || !userProfile?.collegeId) {
        if (!authLoading) { 
            toast({ title: "Error", description: "User or college information not found.", variant: "destructive" });
        }
        setIsLoadingPageData(false);
        return;
      }
      setIsLoadingPageData(true);
      try {
        // Fetch college languages
        const langsRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
        const langsSnap = await getDocs(query(langsRef, orderBy('name', 'asc')));
        const fetchedLanguages = langsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ProgrammingLanguage));
        setCollegeLanguages(fetchedLanguages);

        // Fetch saved programs
        const programsRef = collection(db, 'users', userProfile.uid, 'savedPrograms');
        const programsSnap = await getDocs(query(programsRef, orderBy('updatedAt', 'desc')));
        const fetchedPrograms = programsSnap.docs.map(docSnap => ({ 
            id: docSnap.id, 
            ...docSnap.data(),
            // Ensure timestamps are converted to Date objects for client-side sorting if needed
            createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : new Date(),
            updatedAt: docSnap.data().updatedAt?.toDate ? docSnap.data().updatedAt.toDate() : new Date(),
        } as SavedProgram));
        setSavedPrograms(fetchedPrograms);

        if (!activeProgramId && fetchedLanguages.length > 0) {
          const initialLang = fetchedLanguages[0];
          setSelectedLanguage(initialLang);
          setCurrentCode(getDefaultCodeForLanguage(initialLang.name));
        } else if (fetchedLanguages.length === 0) {
           setCurrentCode("// No languages available in your college. Please contact admin.");
        }

      } catch (error) {
        console.error("Error fetching sandbox data:", error);
        toast({ title: "Error", description: "Failed to load sandbox data.", variant: "destructive" });
      } finally {
        setIsLoadingPageData(false);
      }
    };
    if (!authLoading && userProfile) {
        fetchData();
    } else if (!authLoading && !userProfile) {
        setIsLoadingPageData(false); 
    }
  }, [userProfile, authLoading, toast, activeProgramId]);


  const handleNewProgram = useCallback(() => {
    setActiveProgramId(null);
    setCurrentProgramTitle('');
    setOutput('');
    setErrorOutput('');
    setSampleInput('');
    setActiveTab("input");
    if (collegeLanguages.length > 0) {
      const defaultLang = collegeLanguages[0]; // Always default to first available
      setSelectedLanguage(defaultLang);
      setCurrentCode(getDefaultCodeForLanguage(defaultLang.name));
    } else {
      setSelectedLanguage(null);
      setCurrentCode("// No languages available to create a new program.");
    }
    toast({ title: "New Program Ready", description: "Editor cleared. You can start coding." });
  }, [collegeLanguages, toast]);


  const handleLoadProgram = useCallback((program: SavedProgram) => {
    setActiveProgramId(program.id);
    setCurrentProgramTitle(program.title);
    setCurrentCode(program.code);
    
    const languageToLoad = collegeLanguages.find(lang => lang.name === program.languageName);
    if (languageToLoad) {
      setSelectedLanguage(languageToLoad);
    } else {
      toast({
        title: "Language Mismatch",
        description: `The language "${program.languageName}" this program was saved with is not currently available. Defaulting to the first available language.`,
        variant: "default"
      });
      if (collegeLanguages.length > 0) {
        setSelectedLanguage(collegeLanguages[0]);
      } else {
        setSelectedLanguage(null);
      }
    }
    setSampleInput(program.lastInput || '');
    setOutput('');
    setErrorOutput('');
    setActiveTab("input");
  }, [collegeLanguages, toast]);

  const handleSaveProgram = async () => {
    if (!userProfile?.uid) {
      toast({ title: "Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    if (!currentProgramTitle.trim()) {
      toast({ title: "Title Required", description: "Please enter a title for your program.", variant: "destructive" });
      return;
    }
    if (!selectedLanguage) {
      toast({ title: "Language Required", description: "Please select a programming language.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const programDataToSave = {
      userId: userProfile.uid,
      title: currentProgramTitle.trim(),
      code: currentCode,
      languageName: selectedLanguage.name,
      languageId: selectedLanguage.id,
      iconName: selectedLanguage.iconName || 'FileCode',
      lastInput: sampleInput,
      updatedAt: serverTimestamp(),
    };

    try {
      if (activeProgramId) {
        const programDocRef = doc(db, 'users', userProfile.uid, 'savedPrograms', activeProgramId);
        await updateDoc(programDocRef, programDataToSave);
        setSavedPrograms(prev => prev.map(p => p.id === activeProgramId ? { ...p, ...programDataToSave, id: activeProgramId, updatedAt: new Date() } : p).sort((a,b) => (b.updatedAt as Date).valueOf() - (a.updatedAt as Date).valueOf()));
        toast({ title: "Program Updated!", description: `"${programDataToSave.title}" has been updated.` });
      } else {
        const programsCollectionRef = collection(db, 'users', userProfile.uid, 'savedPrograms');
        const newDocRef = await addDoc(programsCollectionRef, {
          ...programDataToSave,
          createdAt: serverTimestamp(),
        });
        const newProgram = { ...programDataToSave, id: newDocRef.id, createdAt: new Date(), updatedAt: new Date() } as SavedProgram;
        setActiveProgramId(newDocRef.id);
        setSavedPrograms(prev => [newProgram, ...prev].sort((a,b) => (b.updatedAt as Date).valueOf() - (a.updatedAt as Date).valueOf()));
        toast({ title: "Program Saved!", description: `"${programDataToSave.title}" has been saved.` });
      }
    } catch (error) {
      console.error("Error saving program:", error);
      toast({ title: "Save Error", description: "Failed to save your program.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (!programToDelete || !userProfile?.uid) return;
    setIsSaving(true); 
    try {
      await deleteDoc(doc(db, 'users', userProfile.uid, 'savedPrograms', programToDelete.id));
      setSavedPrograms(prev => prev.filter(p => p.id !== programToDelete.id));
      toast({ title: "Program Deleted", description: `"${programToDelete.title}" has been deleted.` });
      if (activeProgramId === programToDelete.id) {
        handleNewProgram(); 
      }
    } catch (error) {
      console.error("Error deleting program:", error);
      toast({ title: "Delete Error", description: "Failed to delete program.", variant: "destructive" });
    } finally {
      setProgramToDelete(null);
      setIsSaving(false);
    }
  };

  const handleRunCode = async () => {
    if (!selectedLanguage || !currentCode.trim()) {
      toast({ title: "Cannot Run", description: "Please select a language and write some code.", variant: "destructive" });
      return;
    }
    setIsExecuting(true);
    setOutput('');
    setErrorOutput('');
    setActiveTab("output");

    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage.name,
          code: currentCode,
          sampleInput: sampleInput,
          executionType: 'run', 
        }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.executionError || result.compileError || result.message || "Code execution request failed");
      }

      if (result.compileError) {
        setErrorOutput(`Compilation Error:\n${result.compileError}`);
        setOutput(result.generalOutput || '');
        setActiveTab("errors");
      } else if (result.executionError) {
        setErrorOutput(`Runtime Error:\n${result.executionError}`);
        setOutput(result.generalOutput || '');
        setActiveTab("errors");
      } else {
        setOutput(result.generalOutput || (result.testCaseResults && result.testCaseResults[0]?.actualOutput) || "Execution complete. No output.");
        setErrorOutput('');
      }
      if (activeProgramId && userProfile?.uid) {
        const programDocRef = doc(db, 'users', userProfile.uid, 'savedPrograms', activeProgramId);
        await updateDoc(programDocRef, { lastInput: sampleInput, updatedAt: serverTimestamp() });
         setSavedPrograms(prev => prev.map(p => p.id === activeProgramId ? { ...p, lastInput: sampleInput, updatedAt: new Date() } : p).sort((a,b) => (b.updatedAt as Date).valueOf() - (a.updatedAt as Date).valueOf()));
      }

    } catch (error: any) {
      console.error("Error running code:", error);
      setErrorOutput(`Error: ${error.message}`);
      setActiveTab("errors");
      toast({ title: "Execution Error", description: error.message, variant: "destructive" });
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleLanguageChange = (langId: string) => {
    const lang = collegeLanguages.find(l => l.id === langId);
    if (lang) {
      setSelectedLanguage(lang);
      if (!activeProgramId) { 
        setCurrentCode(getDefaultCodeForLanguage(lang.name));
      }
      setOutput(''); 
      setErrorOutput('');
    }
  };


  if (authLoading || isLoadingPageData) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading Sandbox...</span>
      </div>
    );
  }
  
  if (!userProfile) {
     return (
      <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
          <p className="text-muted-foreground">Please log in to use the sandbox.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]"> {/* Adjust height to fit within layout padding */}
      {/* Top Control Bar */}
      <div className="flex items-center gap-3 p-2 border-b bg-muted/30 shrink-0">
        <Input
          placeholder="Program Title (e.g., My Quick Sort)"
          value={currentProgramTitle}
          onChange={(e) => setCurrentProgramTitle(e.target.value)}
          className="h-9 flex-grow max-w-sm bg-background"
          disabled={isSaving || isExecuting}
        />
        <Select
          value={selectedLanguage?.id || ''}
          onValueChange={handleLanguageChange}
          disabled={isSaving || isExecuting || collegeLanguages.length === 0}
        >
          <SelectTrigger className="w-[180px] h-9 bg-background">
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent>
            {collegeLanguages.length > 0 ? collegeLanguages.map(lang => (
              <SelectItem key={lang.id} value={lang.id}>{lang.name}</SelectItem>
            )) : <SelectItem value="none" disabled>No languages available</SelectItem>}
          </SelectContent>
        </Select>
        <Button onClick={handleSaveProgram} size="sm" className="h-9" disabled={isSaving || isExecuting || !currentProgramTitle.trim() || !selectedLanguage}>
          {isSaving && activeProgramId ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">{activeProgramId ? 'Update' : 'Save'}</span>
        </Button>
        <Button onClick={handleRunCode} size="sm" className="h-9" variant="outline" disabled={isSaving || isExecuting || !currentCode.trim() || !selectedLanguage}>
          {isExecuting ? <Loader2 className="animate-spin h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">Run</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Card className="w-[280px] flex flex-col border-r rounded-none shrink-0">
          <CardHeader className="p-2 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold">My Programs</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewProgram} disabled={isSaving || isExecuting} title="New Program">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="p-1">
              {savedPrograms.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">No saved programs yet. Create one and click "Save"!</p>
              ) : (
                <ul className="space-y-0.5">
                  {savedPrograms.map(program => {
                    const ProgramIcon = getIconComponent(program.iconName);
                    return (
                       <li 
                          key={program.id} 
                          className={cn(
                            "group flex items-center justify-between rounded-sm hover:bg-muted/50",
                            activeProgramId === program.id && "bg-primary/10"
                          )}
                        >
                          <div
                            className={cn(
                                "flex flex-1 items-center gap-1.5 p-1.5 cursor-pointer truncate",
                                activeProgramId === program.id && "text-primary font-medium"
                            )}
                            onClick={() => !(isSaving || isExecuting) && handleLoadProgram(program)}
                            role="button"
                            tabIndex={isSaving || isExecuting ? -1 : 0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (!(isSaving || isExecuting)) handleLoadProgram(program); } }}
                            title={`Load program: ${program.title}`}
                          >
                            <ProgramIcon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate" title={program.title}>{program.title}</span>
                          </div>
                          
                          <AlertDialog onOpenChange={(open) => !open && setProgramToDelete(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 mr-1 p-1"
                                onClick={(e) => { e.stopPropagation(); setProgramToDelete(program);}}
                                disabled={isSaving || isExecuting}
                                title="Delete Program"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            {programToDelete && programToDelete.id === program.id && (
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{programToDelete.title}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your saved program.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setProgramToDelete(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteProgram} className="bg-destructive hover:bg-destructive/90">
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            )}
                          </AlertDialog>
                        </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Main Content (Editor + Bottom Panel) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-grow relative">
            <MonacoCodeEditor
              language={selectedLanguage?.name || 'plaintext'}
              value={currentCode}
              onChange={(code) => setCurrentCode(code || '')}
              height="100%" 
              options={{ 
                readOnly: isSaving || isExecuting || !selectedLanguage,
                minimap: { enabled: true, scale: 1 },
                wordWrap: 'on',
                fontSize: 14,
                scrollBeyondLastLine: false,
                padding: { top: 10, bottom: 10 }
              }}
            />
             {!selectedLanguage && collegeLanguages.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <p className="text-muted-foreground p-4 bg-card border rounded-md shadow-lg">Please select a language to start coding.</p>
                </div>
            )}
             {collegeLanguages.length === 0 && !isLoadingPageData && (
                 <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <p className="text-destructive p-4 bg-card border rounded-md shadow-lg">No programming languages available in your college. Please contact an administrator.</p>
                </div>
             )}
          </div>

          {/* Bottom Panel (Input/Output/Errors) */}
          <div className="h-[250px] border-t flex flex-col bg-muted/20 shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="shrink-0 rounded-none border-b bg-muted/50 justify-start px-2 h-10">
                <TabsTrigger value="input" className="text-xs px-3 py-1.5 h-auto data-[state=active]:bg-background">
                    <ClipboardType className="mr-1.5 h-3.5 w-3.5"/> Sample Input
                </TabsTrigger>
                <TabsTrigger value="output" className="text-xs px-3 py-1.5 h-auto data-[state=active]:bg-background">
                    <Terminal className="mr-1.5 h-3.5 w-3.5"/> Output
                </TabsTrigger>
                <TabsTrigger value="errors" className="text-xs px-3 py-1.5 h-auto data-[state=active]:bg-background">
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5"/> Errors
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-hidden p-0 m-0">
                <TabsContent value="input" className="h-full mt-0 p-0">
                  <Textarea
                    placeholder="Enter sample input for your code here..."
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm p-2"
                    disabled={isExecuting}
                  />
                </TabsContent>
                <TabsContent value="output" className="h-full mt-0 p-0">
                  <ScrollArea className="h-full bg-background">
                    <pre className="p-2 text-sm whitespace-pre-wrap font-mono min-h-full">
                      {isExecuting && !output && !errorOutput && <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                      {output || (!isExecuting && "Code output will appear here.")}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="errors" className="h-full mt-0 p-0">
                  <ScrollArea className="h-full bg-background">
                    <pre className="p-2 text-sm text-destructive whitespace-pre-wrap font-mono min-h-full">
                       {isExecuting && !output && !errorOutput && <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                      {errorOutput || (!isExecuting && "Compilation or runtime errors will appear here.")}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
