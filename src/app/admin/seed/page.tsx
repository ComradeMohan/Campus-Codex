
'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const questionsData = {
  "course": "CSA09 – Java Programming",
  "total_questions": 60,
  "questions": [
    // Data has been truncated for brevity in the prompt, but the logic will handle the full set.
    { "id": 1, "title": "Reverse String", "difficulty": "easy", "max_score": 100 },
    { "id": 2, "title": "String to Integer", "difficulty": "easy", "max_score": 100 },
    { "id": 3, "title": "Palindrome Check", "difficulty": "easy", "max_score": 100 },
    { "id": 4, "title": "Prime Number Check", "difficulty": "easy", "max_score": 100 },
    { "id": 5, "title": "Fibonacci Series", "difficulty": "easy", "max_score": 100 },
    { "id": 6, "title": "Factorial Calculation", "difficulty": "easy", "max_score": 100 },
    { "id": 7, "title": "Array Sum", "difficulty": "easy", "max_score": 100 },
    { "id": 8, "title": "Find Max in Array", "difficulty": "easy", "max_score": 100 },
    { "id": 9, "title": "Binary Search", "difficulty": "medium", "max_score": 150 },
    { "id": 10, "title": "Linear Search", "difficulty": "easy", "max_score": 100 },
    { "id": 11, "title": "Bubble Sort", "difficulty": "easy", "max_score": 100 },
    { "id": 12, "title": "Insertion Sort", "difficulty": "easy", "max_score": 100 },
    { "id": 13, "title" ,"Selection Sort", "difficulty": "easy", "max_score": 100 },
    { "id": 14, "title": "Merge Sort", "difficulty": "medium", "max_score": 150 },
    { "id": 15, "title": "Quick Sort", "difficulty": "medium", "max_score": 150 },
    { "id": 16, "title": "Linked List Implementation", "difficulty": "medium", "max_score": 150 },
    { "id": 17, "title": "Stack Implementation", "difficulty": "medium", "max_score": 150 },
    { "id": 18, "title": "Queue Implementation", "difficulty": "medium", "max_score": 150 },
    { "id": 19, "title": "Tree Traversal (Inorder, Preorder, Postorder)", "difficulty": "medium", "max_score": 200 },
    { "id": 20, "title": "Graph Traversal (DFS, BFS)", "difficulty": "medium", "max_score": 200 },
    { "id": 21, "title": "Check for Balanced Parentheses", "difficulty": "medium", "max_score": 150 },
    { "id": 22, "title": "Two Sum Problem", "difficulty": "easy", "max_score": 100 },
    { "id": 23, "title": "Anagram Check", "difficulty": "easy", "max_score": 100 },
    { "id": 24, "title": "Rotate Array", "difficulty": "easy", "max_score": 100 },
    { "id": 25, "title": "Longest Common Subsequence", "difficulty": "hard", "max_score": 250 },
    { "id": 26, "title": "Knapsack Problem", "difficulty": "hard", "max_score": 300 },
    { "id": 27, "title": "Dijkstra's Algorithm", "difficulty": "hard", "max_score": 300 },
    { "id": 28, "title": "K-th Smallest Element", "difficulty": "medium", "max_score": 150 },
    { "id": 29, "title": "LRU Cache", "difficulty": "hard", "max_score": 250 },
    { "id": 30, "title": "Valid Sudoku", "difficulty": "medium", "max_score": 200 },
    { "id": 31, "title": "Count Vowels and Consonants", "difficulty": "easy", "max_score": 100 },
    { "id": 32, "title": "Remove Duplicates from Array", "difficulty": "easy", "max_score": 100 },
    { "id": 33, "title": "Find Missing Number", "difficulty": "easy", "max_score": 100 },
    { "id": 34, "title": "Generate Permutations", "difficulty": "medium", "max_score": 200 },
    { "id": 35, "title": "Coin Change Problem", "difficulty": "hard", "max_score": 250 },
    { "id": 36, "title": "Matrix Multiplication", "difficulty": "easy", "max_score": 100 },
    { "id": 37, "title": "Tower of Hanoi", "difficulty": "medium", "max_score": 150 },
    { "id": 38, "title": "Longest Palindromic Substring", "difficulty": "medium", "max_score": 200 },
    { "id": 39, "title": "Implement Trie", "difficulty": "hard", "max_score": 250 },
    { "id": 40, "title": "Word Break Problem", "difficulty": "hard", "max_score": 250 },
    { "id": 41, "title": "Armstrong Number", "difficulty": "easy", "max_score": 100 },
    { "id": 42, "title": "Perfect Number", "difficulty": "easy", "max_score": 100 },
    { "id": 43, "title": "Find Duplicate Characters", "difficulty": "easy", "max_score": 100 },
    { "id": 44, "title": "Check if a number is a power of two", "difficulty": "easy", "max_score": 100 },
    { "id": 45, "title": "Pascal's Triangle", "difficulty": "easy", "max_score": 100 },
    { "id": 46, "title": "Maximum Subarray Sum", "difficulty": "medium", "max_score": 150 },
    { "id": 47, "title": "Jump Game", "difficulty": "medium", "max_score": 150 },
    { "id": 48, "title": "Container With Most Water", "difficulty": "medium", "max_score": 150 },
    { "id": 49, "title": "N-Queens Problem", "difficulty": "hard", "max_score": 300 },
    { "id": 50, "title": "Regular Expression Matching", "difficulty": "hard", "max_score": 300 },
    { "id": 51, "title": "Median of Two Sorted Arrays", "difficulty": "hard", "max_score": 250 },
    { "id": 52, "title": "Lowest Common Ancestor of a Binary Tree", "difficulty": "medium", "max_score": 150 },
    { "id": 53, "title": "Serialize and Deserialize Binary Tree", "difficulty": "hard", "max_score": 250 },
    { "id": 54, "title": "Top K Frequent Elements", "difficulty": "medium", "max_score": 150 },
    { "id": 55, "title": "Group Anagrams", "difficulty": "medium", "max_score": 150 },
    { "id": 56, "title": "Product of Array Except Self", "difficulty": "medium", "max_score": 150 },
    { "id": 57, "title": "Number of Islands", "difficulty": "medium", "max_score": 150 },
    { "id": 58, "title": "Course Schedule", "difficulty": "medium", "max_score": 200 },
    { "id": 59, "title": "Word Ladder", "difficulty": "hard", "max_score": 250 },
    { "id": 60, "title": "Trapping Rain Water", "difficulty": "hard", "max_score": 300 }
  ]
};

export default function SeedDatabasePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  
  const handleSeedDatabase = async () => {
    if (!userProfile?.collegeId) {
      toast({ title: "Error", description: "Admin/College context not found.", variant: "destructive" });
      return;
    }
    
    setIsSeeding(true);
    setLog(['Starting database seed process...']);

    try {
      const languagesRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
      const q = query(languagesRef, where("name", "==", "Java"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLog(prev => [...prev, 'Error: "Java" language not found in your college courses. Please add it first from the Course Management page.']);
        toast({ title: 'Seeding Failed', description: '"Java" language not found. Please add it first.', variant: 'destructive' });
        setIsSeeding(false);
        return;
      }
      
      const javaLanguageDoc = querySnapshot.docs[0];
      const javaLanguageId = javaLanguageDoc.id;
      setLog(prev => [...prev, `Found "Java" language with ID: ${javaLanguageId}`]);

      const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', javaLanguageId, 'questions');
      const batch = writeBatch(db);
      let count = 0;

      questionsData.questions.forEach(q => {
        const docRef = collection(questionsRef).doc(); // Generate a new doc ref in the collection
        const newQuestion: Omit<Question, 'id'> = {
            languageId: javaLanguageId,
            languageName: "Java",
            questionText: q.title, // Using title as question statement
            difficulty: q.difficulty as Question['difficulty'],
            maxScore: q.max_score,
            sampleInput: `Sample Input for ${q.title}`,
            sampleOutput: `Sample Output for ${q.title}`,
            solution: `Solve the problem using basic Java logic for: ${q.title}`,
            testCases: [
                { input: `Sample Input for ${q.title}`, expectedOutput: `Sample Output for ${q.title}` },
                { input: `Edge Case 1 for ${q.title}`, expectedOutput: "Handled" },
                { input: `Edge Case 2 for ${q.title}`, expectedOutput: "Handled" }
            ],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        batch.set(docRef, newQuestion);
        count++;
      });
      
      setLog(prev => [...prev, `Preparing to commit ${count} questions to the database...`]);
      await batch.commit();
      
      setLog(prev => [...prev, `Successfully seeded ${count} questions for Java.`, 'Process complete!']);
      toast({ title: 'Database Seeded!', description: `${count} Java questions have been added.` });

    } catch (error: any) {
      console.error("Error seeding database:", error);
      setLog(prev => [...prev, `An error occurred: ${error.message}`]);
      toast({ title: 'Seeding Error', description: error.message || "An unknown error occurred.", variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  };

  if (authLoading) {
    return <div className="container mx-auto py-8 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
            <h1 className="text-3xl font-headline flex items-center">
                <Database className="w-8 h-8 mr-3 text-primary" />
                Database Seeding Utility
            </h1>
            <Button asChild variant="outline">
                <Link href="/admin/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
            </Button>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Seed Java Questions</CardTitle>
          <CardDescription>
            This tool will populate the Firestore database with 60 predefined Java questions. 
            This operation should only be run once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold">Warning</h3>
                <p className="text-sm">
                  This action will add multiple documents to your Firestore database and may result in billing charges depending on your Firebase plan. Ensure the "Java" programming language exists in your courses before proceeding.
                </p>
              </div>
            </div>
          </div>
          <Button onClick={handleSeedDatabase} disabled={isSeeding}>
            {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Seeding
          </Button>
        </CardContent>
      </Card>
      
      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seeding Log</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs h-64 overflow-y-auto">
              {log.join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
