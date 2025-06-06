
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, FieldValue, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { MonacoCodeEditor } from '@/components/editor/MonacoCodeEditor';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Play, Trash2, PlusCircle, FileCode, Terminal, AlertTriangle, ClipboardType, Share2, PanelLeftOpen, X } from 'lucide-react';
import type { ProgrammingLanguage, SavedProgram } from '@/types';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const PLACEMENTS_COURSE_NAME = "Placements";

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
    return `# Welcome to the Sandbox! Start coding in Python.
# Use the "Sample Input" tab below to provide input for your program.
# Your program can read this input using functions like input().

def main():
    print("Hello from Python Sandbox!")
    # Example of reading input:
    # try:
    #   name = input("Enter your name (from Sample Input):\\n")
    #   print(f"Hello, {name}!")
    #   num_str = input("Enter a number:\\n")
    #   num = int(num_str)
    #   print(f"Number squared: {num*num}")
    # except EOFError:
    #   print("No input provided or end of input reached.")
    # except ValueError:
    #   print("Invalid number entered.")

if __name__ == "__main__":
    main()
`;
  } else if (lowerLang === 'javascript') {
    return `// Welcome to the Sandbox! Start coding in JavaScript.
// Use the "Sample Input" tab below to provide input for your program.
// Input is typically read line by line from process.stdin.

function main() {
    console.log("Hello from JavaScript Sandbox!");

    // Example for reading input (requires 'readline' module in execution environment):
    /*
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    let lines = [];
    rl.on('line', (line) => {
        lines.push(line);
    });

    rl.on('close', () => {
        console.log("Received all input lines:", lines);
        if (lines.length > 0) {
            console.log("First line was:", lines[0]);
        }
        // Process lines here
    });
    */
}

main();
`;
  } else if (lowerLang === 'java') {
    return `// Welcome to the Sandbox! Start coding in Java.
// Use the "Sample Input" tab below to provide input for your program.
// Read input using a Scanner for System.in.

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("Hello from Java Sandbox!");

        // Example of reading input:
        // System.out.println("Enter your name (from Sample Input):");
        // if (scanner.hasNextLine()) {
        //    String name = scanner.nextLine();
        //    System.out.println("Hello, " + name + "!");
        // }
        
        // System.out.println("Enter an integer:");
        // if (scanner.hasNextInt()) {
        //    int number = scanner.nextInt();
        //    System.out.println("You entered the number: " + number);
        // } else if (scanner.hasNextLine()) { 
        //    scanner.nextLine(); 
        //    System.out.println("That wasn't an integer.");
        // } else {
        //    System.out.println("No further input provided.");
        // }
        
        scanner.close();
    }
}
`;
  }
  return `// Welcome to the Sandbox! Start coding in ${langName}.\n// Use the "Sample Input" tab to provide input.`;
};


export default function StudentSandboxPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allCollegeLanguages, setAllCollegeLanguages] = useState<ProgrammingLanguage[]>([]);
  const [programmingLanguages, setProgrammingLanguages] = useState<ProgrammingLanguage[]>([]);
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [currentProgramTitle, setCurrentProgramTitle] = useState('');
  const [currentCode, setCurrentCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage | null>(null);
  
  const [sampleInput, setSampleInput] = useState('');
  const [output, setOutput] = useState('');
  const [errorOutput, setErrorOutput] = useState('');
  const [activeTab, setActiveTab] = useState("input"); 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);


  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isLoadingSharedProgram, setIsLoadingSharedProgram] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<SavedProgram | null>(null);

  const loadProgramIntoEditor = useCallback((programData: Partial<SavedProgram>, availableLangs: ProgrammingLanguage[], isShared = false) => {
    setCurrentProgramTitle(isShared ? `[Shared] ${programData.title || 'Untitled'}` : programData.title || '');
    setCurrentCode(programData.code || '');
    setSampleInput(programData.lastInput || '');

    let languageToLoad: ProgrammingLanguage | null = null;
    if(programData.languageId) {
        languageToLoad = availableLangs.find(lang => lang.id === programData.languageId) || null;
    }
    if(!languageToLoad && programData.languageName) {
        languageToLoad = availableLangs.find(lang => lang.name === programData.languageName) || null;
    }
    if(!languageToLoad && availableLangs.length > 0) {
        languageToLoad = availableLangs[0];
    }
    
    setSelectedLanguage(languageToLoad);

    if ((programData.code === undefined || programData.code === '') && !isShared) {
        setCurrentCode(getDefaultCodeForLanguage(languageToLoad?.name));
    } else {
        setCurrentCode(programData.code || getDefaultCodeForLanguage(languageToLoad?.name));
    }
    
    if (!languageToLoad && programData.languageName) {
         toast({
            title: "Language Mismatch",
            description: `The language "${programData.languageName}" this program was saved/shared with is not currently available. Code loaded as plaintext.`,
            variant: "default"
        });
    }


    setOutput('');
    setErrorOutput('');
    setActiveTab("input");
  }, [toast, setCurrentCode, setSelectedLanguage, setCurrentProgramTitle, setSampleInput, setOutput, setErrorOutput, setActiveTab]);


  const handleLoadProgram = useCallback((program: SavedProgram, availableLangs: ProgrammingLanguage[]) => {
    setActiveProgramId(program.id);
    loadProgramIntoEditor(program, availableLangs);
    setIsMobileSidebarOpen(false); // Close mobile sidebar if open
  }, [loadProgramIntoEditor, setActiveProgramId, setIsMobileSidebarOpen]);


  const handleNewProgram = useCallback(() => {
    setActiveProgramId(null);
    const newProgramDefaults: Partial<SavedProgram> = { title: '', code: '', lastInput: '' };
    
    let langForNewProgram = selectedLanguage;
    if (!langForNewProgram && programmingLanguages.length > 0) {
        langForNewProgram = programmingLanguages[0];
    }
    
    if (langForNewProgram) {
        newProgramDefaults.languageName = langForNewProgram.name;
        newProgramDefaults.languageId = langForNewProgram.id;
    }
    
    loadProgramIntoEditor(newProgramDefaults, programmingLanguages);
    setIsMobileSidebarOpen(false); // Close mobile sidebar if open
    toast({ title: "New Program Ready", description: "Editor cleared. You can start coding." });
  }, [programmingLanguages, loadProgramIntoEditor, toast, selectedLanguage, setActiveProgramId, setIsMobileSidebarOpen]);


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
        const langsRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
        const langsSnap = await getDocs(query(langsRef, orderBy('name', 'asc')));
        const fetchedCollegeLanguages = langsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ProgrammingLanguage));
        setAllCollegeLanguages(fetchedCollegeLanguages);
        
        const actualProgrammingLangs = fetchedCollegeLanguages.filter(lang => lang.name !== PLACEMENTS_COURSE_NAME);
        setProgrammingLanguages(actualProgrammingLangs);

        const programsRef = collection(db, 'users', userProfile.uid, 'savedPrograms');
        const programsSnap = await getDocs(query(programsRef, orderBy('updatedAt', 'desc')));
        const fetchedPrograms = programsSnap.docs.map(docSnap => ({ 
            id: docSnap.id, 
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : new Date(),
            updatedAt: docSnap.data().updatedAt?.toDate ? docSnap.data().updatedAt.toDate() : new Date(),
        } as SavedProgram));
        setSavedPrograms(fetchedPrograms);

        if (actualProgrammingLangs.length > 0 && !activeProgramId && !searchParams.get('shareUserId')) {
          const initialLang = actualProgrammingLangs[0];
          setSelectedLanguage(initialLang);
          setCurrentCode(getDefaultCodeForLanguage(initialLang.name));
        } else if (actualProgrammingLangs.length === 0 && !searchParams.get('shareUserId')) {
           setCurrentCode("// No programming languages available in your college for the sandbox. Please contact admin.");
           setSelectedLanguage(null);
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
  }, [userProfile, authLoading, toast]);


  useEffect(() => {
    const shareUserId = searchParams.get('shareUserId');
    const shareProgramId = searchParams.get('shareProgramId');

    if (shareUserId && shareProgramId && userProfile && allCollegeLanguages.length > 0) {
      const fetchSharedProgram = async () => {
        setIsLoadingSharedProgram(true);
        try {
          const programDocRef = doc(db, 'users', shareUserId, 'savedPrograms', shareProgramId);
          const programSnap = await getDoc(programDocRef);

          if (programSnap.exists()) {
            const sharedProgramData = programSnap.data() as SavedProgram;
            loadProgramIntoEditor(sharedProgramData, allCollegeLanguages, true);
            setActiveProgramId(null); 
            toast({ title: "Shared Program Loaded", description: `Viewing "${sharedProgramData.title}". You can save it as your own copy.`});
          } else {
            toast({ title: "Error", description: "Shared program not found or access denied.", variant: "destructive" });
          }
        } catch (error) {
          console.error("Error fetching shared program:", error);
          toast({ title: "Error", description: "Could not load the shared program.", variant: "destructive" });
        } finally {
          setIsLoadingSharedProgram(false);
          router.replace('/student/sandbox', { scroll: false });
        }
      };
      fetchSharedProgram();
    }
  }, [searchParams, userProfile, allCollegeLanguages, loadProgramIntoEditor, router, toast, setActiveProgramId]);


  const handleSaveProgram = useCallback(async () => {
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
    const programDataToSave: Omit<SavedProgram, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & {updatedAt: FieldValue, userId: string, createdAt?: FieldValue} = {
      title: currentProgramTitle.trim().replace(/^\[Shared\]\s*/, ''),
      code: currentCode,
      languageName: selectedLanguage.name,
      languageId: selectedLanguage.id,
      iconName: selectedLanguage.iconName || 'FileCode',
      lastInput: sampleInput,
      updatedAt: serverTimestamp(),
      userId: userProfile.uid,
    };

    try {
      if (activeProgramId) {
        const programDocRef = doc(db, 'users', userProfile.uid, 'savedPrograms', activeProgramId);
        await updateDoc(programDocRef, programDataToSave);
        setSavedPrograms(prev => prev.map(p => p.id === activeProgramId ? { ...p, ...programDataToSave, id: activeProgramId, updatedAt: new Date() } : p).sort((a,b) => (b.updatedAt as Date).valueOf() - (a.updatedAt as Date).valueOf()));
        toast({ title: "Program Updated!", description: `"${programDataToSave.title}" has been updated.` });
      } else {
        programDataToSave.createdAt = serverTimestamp();
        const programsCollectionRef = collection(db, 'users', userProfile.uid, 'savedPrograms');
        const newDocRef = await addDoc(programsCollectionRef, programDataToSave);
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
  }, [userProfile, currentProgramTitle, selectedLanguage, currentCode, sampleInput, activeProgramId, toast, setActiveProgramId, setSavedPrograms]);

  const handleDeleteProgram = useCallback(async () => {
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
  },[programToDelete, userProfile, toast, setSavedPrograms, handleNewProgram, activeProgramId, setProgramToDelete]);

  const handleRunCode = useCallback(async () => {
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
        const displayedOutput = result.generalOutput || (result.testCaseResults && result.testCaseResults[0]?.actualOutput) || "Execution complete. No output or specific result format received.";
        setOutput(displayedOutput);
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
  }, [selectedLanguage, currentCode, sampleInput, toast, activeProgramId, userProfile, setActiveTab, setOutput, setErrorOutput, setSavedPrograms]);
  
  const handleLanguageChange = useCallback((langId: string) => {
    const lang = programmingLanguages.find(l => l.id === langId);
    if (lang) {
      setSelectedLanguage(lang);
      const currentActiveProgram = savedPrograms.find(p => p.id === activeProgramId);
      if (!currentActiveProgram || currentActiveProgram.languageName !== lang.name) {
         setCurrentCode(getDefaultCodeForLanguage(lang.name));
      }
      setOutput(''); 
      setErrorOutput('');
      setActiveTab("input");
    }
  }, [programmingLanguages, setSelectedLanguage, savedPrograms, activeProgramId, setCurrentCode, setOutput, setErrorOutput, setActiveTab]);

  const handleShareProgram = useCallback((program: SavedProgram) => {
    if (!program.userId || !program.id) {
      toast({title: "Error", description: "Cannot generate share link for this program.", variant: "destructive"});
      return;
    }
    const shareUrl = `${window.location.origin}/student/sandbox?shareUserId=${program.userId}&shareProgramId=${program.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast({title: "Link Copied!", description: "Share link copied to clipboard."});
      })
      .catch(err => {
        console.error("Failed to copy share link: ", err);
        toast({title: "Error", description: "Could not copy link. Please try again.", variant: "destructive"});
      });
  }, [toast]);

  const sidebarContent = (isMobileContext = false) => (
    <>
      <CardHeader className="p-2 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold">My Programs</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={handleNewProgram} 
            disabled={isSaving || isExecuting || programmingLanguages.length === 0} 
            title="New Program"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-1">
          {savedPrograms.length === 0 && programmingLanguages.length > 0 ? (
            <p className="p-3 text-xs text-muted-foreground text-center">No saved programs yet. Create one and click "Save"!</p>
          ) : programmingLanguages.length === 0 && savedPrograms.length === 0 && !selectedLanguage ? (
            <p className="p-3 text-xs text-muted-foreground text-center">Sandbox disabled. No languages available.</p>
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
                            "flex flex-1 items-center gap-1.5 p-1.5 cursor-pointer truncate text-xs",
                            activeProgramId === program.id && "text-primary font-medium"
                        )}
                        onClick={() => !(isSaving || isExecuting) && handleLoadProgram(program, allCollegeLanguages)}
                        role="button"
                        tabIndex={isSaving || isExecuting ? -1 : 0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (!(isSaving || isExecuting)) handleLoadProgram(program, allCollegeLanguages); } }}
                        title={`Load program: ${program.title}`}
                      >
                        <ProgramIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate" title={program.title}>{program.title}</span>
                      </div>
                      <div className="flex shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-60 group-hover:opacity-100 focus:opacity-100 p-1"
                            onClick={(e) => { e.stopPropagation(); handleShareProgram(program); }}
                            disabled={isSaving || isExecuting}
                            title="Share Program"
                        >
                            <Share2 className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                        <AlertDialog onOpenChange={(open) => !open && setProgramToDelete(null)}>
                            <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-60 group-hover:opacity-100 focus:opacity-100 p-1"
                                onClick={(e) => { e.stopPropagation(); setProgramToDelete(program);}}
                                disabled={isSaving || isExecuting}
                                title="Delete Program"
                            >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                      </div>
                    </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </ScrollArea>
       {isMobileContext && 
        <SheetClose asChild>
            <Button variant="outline" className="m-2 text-xs h-8">Close Panel</Button>
        </SheetClose>}
    </>
  );


  if (authLoading || isLoadingPageData || isLoadingSharedProgram) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">
            {isLoadingSharedProgram ? "Loading Shared Program..." : "Loading Sandbox..."}
        </span>
      </div>
    );
  }
  
  if (!userProfile) {
     return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center">
          <p className="text-muted-foreground">Please log in to use the sandbox.</p>
      </div>
    );
  }

  const isSandboxDisabled = programmingLanguages.length === 0 && !selectedLanguage;


  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-hidden">
      {/* Top Control Bar */}
      <div className="flex items-center flex-wrap gap-2 p-2 border-b bg-muted/30 shrink-0">
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 md:hidden">
              <PanelLeftOpen className="h-5 w-5" />
              <span className="sr-only">Toggle File Explorer</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
            {sidebarContent(true)}
          </SheetContent>
        </Sheet>
        <Input
          placeholder="Program Title"
          value={currentProgramTitle}
          onChange={(e) => setCurrentProgramTitle(e.target.value)}
          className="h-9 flex-grow min-w-[150px] sm:flex-auto sm:max-w-xs md:max-w-sm bg-background text-xs md:text-sm"
          disabled={isSaving || isExecuting || isSandboxDisabled}
        />
        <Select
          value={selectedLanguage?.id || ''}
          onValueChange={handleLanguageChange}
          disabled={isSaving || isExecuting || programmingLanguages.length === 0}
        >
          <SelectTrigger className="w-auto md:w-[160px] h-9 bg-background text-xs md:text-sm">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {programmingLanguages.length > 0 ? programmingLanguages.map(lang => (
              <SelectItem key={lang.id} value={lang.id} className="text-xs md:text-sm">{lang.name}</SelectItem>
            )) : <SelectItem value="none" disabled>No languages</SelectItem>}
          </SelectContent>
        </Select>
        <Button onClick={handleSaveProgram} size="sm" className="h-9 text-xs md:text-sm" disabled={isSaving || isExecuting || !currentProgramTitle.trim() || !selectedLanguage || isSandboxDisabled}>
          {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          <span className="hidden sm:inline">{activeProgramId ? 'Update' : 'Save'}</span>
          <span className="sm:hidden">Save</span>
        </Button>
        <Button onClick={handleRunCode} size="sm" className="h-9 text-xs md:text-sm" variant="outline" disabled={isSaving || isExecuting || !currentCode.trim() || !selectedLanguage || isSandboxDisabled}>
          {isExecuting ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          <span className="hidden sm:inline">Run</span>
           <span className="sm:hidden">Run</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Card className="w-[240px] md:w-[280px] hidden md:flex flex-col border-r rounded-none shrink-0">
          {sidebarContent()}
        </Card>

        {/* Main Editor and Output Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-grow relative">
            <MonacoCodeEditor
              language={selectedLanguage?.name || 'plaintext'}
              value={currentCode}
              onChange={(code) => setCurrentCode(code || '')}
              height="100%" 
              options={{ 
                readOnly: isSaving || isExecuting || !selectedLanguage || (programmingLanguages.length === 0 && !selectedLanguage),
                minimap: { enabled: true, scale: 1 },
                wordWrap: 'on',
                fontSize: 13, // Slightly smaller for mobile potentially
                scrollBeyondLastLine: false,
                padding: { top: 8, bottom: 8 }
              }}
            />
            {!selectedLanguage && programmingLanguages.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 p-4">
                    <p className="text-muted-foreground text-center p-4 bg-card border rounded-md shadow-lg text-sm">Please select a programming language to start coding.</p>
                </div>
            )}
            {programmingLanguages.length === 0 && !selectedLanguage && !isLoadingPageData && (
                 <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 p-4">
                    <p className="text-destructive text-center p-4 bg-card border rounded-md shadow-lg text-sm">No programming languages available in your college for the sandbox. Please contact an administrator.</p>
                </div>
            )}
          </div>

          {/* Bottom Tabs for Input/Output/Errors */}
          <div className="h-[200px] md:h-[250px] border-t flex flex-col bg-muted/20 shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="shrink-0 rounded-none border-b bg-muted/50 justify-start px-1 md:px-2 h-9 md:h-10">
                <TabsTrigger value="input" className="text-xs px-2 py-1 md:px-3 md:py-1.5 h-auto data-[state=active]:bg-background">
                    <ClipboardType className="mr-1 h-3 w-3 md:h-3.5 md:w-3.5"/> Sample Input
                </TabsTrigger>
                <TabsTrigger value="output" className="text-xs px-2 py-1 md:px-3 md:py-1.5 h-auto data-[state=active]:bg-background">
                    <Terminal className="mr-1 h-3 w-3 md:h-3.5 md:w-3.5"/> Output
                </TabsTrigger>
                <TabsTrigger value="errors" className="text-xs px-2 py-1 md:px-3 md:py-1.5 h-auto data-[state=active]:bg-background">
                    <AlertTriangle className="mr-1 h-3 w-3 md:h-3.5 md:w-3.5"/> Errors
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-hidden p-0 m-0">
                <TabsContent value="input" className="h-full mt-0 p-0">
                  <Textarea
                    placeholder="Enter sample input for your code here..."
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-xs md:text-sm p-2 bg-background"
                    disabled={isExecuting || (programmingLanguages.length === 0 && !selectedLanguage)}
                  />
                </TabsContent>
                <TabsContent value="output" className="h-full mt-0 p-0">
                  <ScrollArea className="h-full bg-background">
                    <pre className="p-2 text-xs md:text-sm whitespace-pre-wrap font-mono min-h-full">
                      {isExecuting && !output && !errorOutput && <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                      {output || (!isExecuting && "Code output will appear here.")}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="errors" className="h-full mt-0 p-0">
                  <ScrollArea className="h-full bg-background">
                    <pre className="p-2 text-xs md:text-sm text-destructive whitespace-pre-wrap font-mono min-h-full">
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

    
