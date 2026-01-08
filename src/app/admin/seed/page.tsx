
'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const questionsData = {
  "course": "Python Programming",
  "source": "python_programming_questions_FULL.json",
  "total_questions": 97,
  "questions": [
    { "id": 1, "title": "Non-Prime Numbers in a Range", "difficulty": "easy", "max_score": 100 },
    { "id": 2, "title": "Leap Year Anniversary Adjustment", "difficulty": "easy", "max_score": 100 },
    { "id": 3, "title": "Simple Interest Calculation", "difficulty": "easy", "max_score": 100 },
    { "id": 4, "title": "Find ASCII Value of Character", "difficulty": "easy", "max_score": 100 },
    { "id": 5, "title": "Check Armstrong Number", "difficulty": "medium", "max_score": 150 },
    { "id": 6, "title": "Sum of First N Natural Numbers", "difficulty": "easy", "max_score": 100 },
    { "id": 7, "title": "Check for Palindrome String", "difficulty": "easy", "max_score": 100 },
    { "id": 8, "title": "Fibonacci Sequence up to N", "difficulty": "easy", "max_score": 100 },
    { "id": 9, "title": "Factorial of a Number", "difficulty": "easy", "max_score": 100 },
    { "id": 10, "title": "Binary to Decimal Conversion", "difficulty": "easy", "max_score": 100 },
    { "id": 11, "title": "Bubble Sort", "difficulty": "easy", "max_score": 100 },
    { "id": 12, "title": "Insertion Sort", "difficulty": "easy", "max_score": 100 },
    { "id": 13, "title": "Selection Sort", "difficulty": "easy", "max_score": 100 },
    { "id": 14, "title": "Merge Sort", "difficulty": "medium", "max_score": 150 },
    { "id": 15, "title": "Quick Sort", "difficulty": "medium", "max_score": 150 },
    { "id": 16, "title": "Linked List Implementation", "difficulty": "medium", "max_score": 150 },
    { "id": 17, "title": "Stack Implementation", "difficulty": "medium", "max_score": 150 },
    { "id": 18, "title": "Queue Implementation", "difficulty": "medium", "max_score": 150 },
    { "id": 19, "title": "Binary Search Tree (BST) Implementation", "difficulty": "hard", "max_score": 200 },
    { "id": 20, "title": "Graph Traversal (BFS)", "difficulty": "hard", "max_score": 200 },
    { "id": 21, "title": "Graph Traversal (DFS)", "difficulty": "hard", "max_score": 200 },
    { "id": 22, "title": "Dijkstra's Algorithm", "difficulty": "hard", "max_score": 250 },
    { "id": 23, "title": "Kruskal's Algorithm", "difficulty": "hard", "max_score": 250 },
    { "id": 24, "title": "Prim's Algorithm", "difficulty": "hard", "max_score": 250 },
    { "id": 25, "title": "Tower of Hanoi", "difficulty": "medium", "max_score": 150 },
    { "id": 26, "title": "N-Queens Problem", "difficulty": "hard", "max_score": 250 },
    { "id": 27, "title": "Sudoku Solver", "difficulty": "hard", "max_score": 250 },
    { "id": 28, "title": "Longest Common Subsequence", "difficulty": "hard", "max_score": 200 },
    { "id": 29, "title": "Matrix Chain Multiplication", "difficulty": "hard", "max_score": 250 },
    { "id": 30, "title": "Edit Distance", "difficulty": "hard", "max_score": 200 },
    { "id": 31, "title": "Knapsack Problem (0/1)", "difficulty": "hard", "max_score": 200 },
    { "id": 32, "title": "Coin Change Problem", "difficulty": "medium", "max_score": 150 },
    { "id": 33, "title": "Maximum Subarray Sum", "difficulty": "medium", "max_score": 150 },
    { "id": 34, "title": "Find the Missing Number", "difficulty": "easy", "max_score": 100 },
    { "id": 35, "title": "Reverse a Linked List", "difficulty": "medium", "max_score": 150 },
    { "id": 36, "title": "Detect Cycle in a Linked List", "difficulty": "medium", "max_score": 150 },
    { "id": 37, "title": "Merge Two Sorted Linked Lists", "difficulty": "medium", "max_score": 150 },
    { "id": 38, "title": "Validate a Binary Search Tree", "difficulty": "medium", "max_score": 150 },
    { "id": 39, "title": "Invert a Binary Tree", "difficulty": "easy", "max_score": 100 },
    { "id": 40, "title": "Lowest Common Ancestor of a BST", "difficulty": "medium", "max_score": 150 },
    { "id": 41, "title": "Implement Trie (Prefix Tree)", "difficulty": "hard", "max_score": 200 },
    { "id": 42, "title": "LRU Cache", "difficulty": "hard", "max_score": 250 },
    { "id": 43, "title": "Word Ladder", "difficulty": "hard", "max_score": 250 },
    { "id": 44, "title": "Find Median from Data Stream", "difficulty": "hard", "max_score": 250 },
    { "id": 45, "title": "Sliding Window Maximum", "difficulty": "hard", "max_score": 200 },
    { "id": 46, "title": "Rotate Image", "difficulty": "medium", "max_score": 150 },
    { "id": 47, "title": "Set Matrix Zeroes", "difficulty": "medium", "max_score": 150 },
    { "id": 48, "title": "Spiral Matrix", "difficulty": "medium", "max_score": 150 },
    { "id": 49, "title": "Group Anagrams", "difficulty": "medium", "max_score": 150 },
    { "id": 50, "title": "Valid Parentheses", "difficulty": "easy", "max_score": 100 },
    { "id": 51, "title": "Two Sum", "difficulty": "easy", "max_score": 100 },
    { "id": 52, "title": "Best Time to Buy and Sell Stock", "difficulty": "easy", "max_score": 100 },
    { "id": 53, "title": "Contains Duplicate", "difficulty": "easy", "max_score": 100 },
    { "id": 54, "title": "Product of Array Except Self", "difficulty": "medium", "max_score": 150 },
    { "id": 55, "title": "Longest Substring Without Repeating Characters", "difficulty": "medium", "max_score": 150 },
    { "id": 56, "title": "Container With Most Water", "difficulty": "medium", "max_score": 150 },
    { "id": 57, "title": "3Sum", "difficulty": "medium", "max_score": 150 },
    { "id": 58, "title": "Climbing Stairs", "difficulty": "easy", "max_score": 100 },
    { "id": 59, "title": "Number of Islands", "difficulty": "medium", "max_score": 150 },
    { "id": 60, "title": "Pacific Atlantic Water Flow", "difficulty": "medium", "max_score": 150 },
    { "id": 61, "title": "Course Schedule", "difficulty": "medium", "max_score": 150 },
    { "id": 62, "title": "Clone Graph", "difficulty": "medium", "max_score": 150 },
    { "id": 63, "title": "Word Break", "difficulty": "medium", "max_score": 150 },
    { "id": 64, "title": "Alien Dictionary", "difficulty": "hard", "max_score": 250 },
    { "id": 65, "title": "Meeting Rooms", "difficulty": "easy", "max_score": 100 },
    { "id": 66, "title": "Meeting Rooms II", "difficulty": "medium", "max_score": 150 },
    { "id": 67, "title": "Insert Interval", "difficulty": "medium", "max_score": 150 },
    { "id": 68, "title": "Merge Intervals", "difficulty": "medium", "max_score": 150 },
    { "id": 69, "title": "Non-overlapping Intervals", "difficulty": "medium", "max_score": 150 },
    { "id": 70, "title": "Reverse Bits", "difficulty": "easy", "max_score": 100 },
    { "id": 71, "title": "Number of 1 Bits", "difficulty": "easy", "max_score": 100 },
    { "id": 72, "title": "Counting Bits", "difficulty": "easy", "max_score": 100 },
    { "id": 73, "title": "Sum of Two Integers", "difficulty": "easy", "max_score": 100 },
    { "id": 74, "title": "Missing Number", "difficulty": "easy", "max_score": 100 },
    { "id": 75, "title": "Kth Smallest Element in a BST", "difficulty": "medium", "max_score": 150 },
    { "id": 76, "title": "Serialize and Deserialize Binary Tree", "difficulty": "hard", "max_score": 250 },
    { "id": 77, "title": "Top K Frequent Elements", "difficulty": "medium", "max_score": 150 },
    { "id": 78, "title": "Find All Anagrams in a String", "difficulty": "medium", "max_score": 150 },
    { "id": 79, "title": "Minimum Window Substring", "difficulty": "hard", "max_score": 250 },
    { "id": 80, "title": "Trapping Rain Water", "difficulty": "hard", "max_score": 250 },
    { "id": 81, "title": "Largest Rectangle in Histogram", "difficulty": "hard", "max_score": 250 },
    { "id": 82, "title": "Basic Calculator", "difficulty": "hard", "max_score": 250 },
    { "id": 83, "title": "Expression Add Operators", "difficulty": "hard", "max_score": 250 },
    { "id": 84, "title": "Regular Expression Matching", "difficulty": "hard", "max_score": 250 },
    { "id": 85, "title": "Wildcard Matching", "difficulty": "hard", "max_score": 250 },
    { "id": 86, "title": "Longest Palindromic Substring", "difficulty": "medium", "max_score": 150 },
    { "id": 87, "title": "Palindromic Substrings", "difficulty": "medium", "max_score": 150 },
    { "id": 88, "title": "Decode Ways", "difficulty": "medium", "max_score": 150 },
    { "id": 89, "title": "House Robber", "difficulty": "easy", "max_score": 100 },
    { "id": 90, "title": "House Robber II", "difficulty": "medium", "max_score": 150 },
    { "id": 91, "title": "Jump Game", "difficulty": "medium", "max_score": 150 },
    { "id": 92, "title": "Unique Paths", "difficulty": "medium", "max_score": 150 },
    { "id": 93, "title": "Coin Change", "difficulty": "medium", "max_score": 150 },
    { "id": 94, "title": "Longest Increasing Subsequence", "difficulty": "medium", "max_score": 150 },
    { "id": 95, "title": "Combination Sum", "difficulty": "medium", "max_score": 150 },
    { "id": 96, "title": "Permutations", "difficulty": "medium", "max_score": 150 },
    { "id": 97, "title": "Subsets", "difficulty": "medium", "max_score": 150 }
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
    setLog(['Starting database seed process for Python questions...']);

    try {
      const languagesRef = collection(db, 'colleges', userProfile.collegeId, 'languages');
      const q = query(languagesRef, where("name", "==", "Python"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLog(prev => [...prev, 'Error: "Python" language not found in your college courses. Please add it first from the Course Management page.']);
        toast({ title: 'Seeding Failed', description: '"Python" language not found. Please add it first.', variant: 'destructive' });
        setIsSeeding(false);
        return;
      }
      
      const pythonLanguageDoc = querySnapshot.docs[0];
      const pythonLanguageId = pythonLanguageDoc.id;
      setLog(prev => [...prev, `Found "Python" language with ID: ${pythonLanguageId}`]);

      const questionsRef = collection(db, 'colleges', userProfile.collegeId, 'languages', pythonLanguageId, 'questions');
      const batch = writeBatch(db);
      let count = 0;

      questionsData.questions.forEach(q => {
        const docRef = doc(questionsRef); // Generate a new doc ref in the collection
        const newQuestion: Omit<Question, 'id'> = {
            languageId: pythonLanguageId,
            languageName: "Python",
            questionText: `Write a Python program to solve: ${q.title}.`,
            difficulty: q.difficulty as Question['difficulty'],
            maxScore: q.max_score,
            sampleInput: "Sample Input",
            sampleOutput: "Sample Output",
            solution: "Solve using standard Python control structures, loops, functions, and data structures.",
            testCases: [
                { input: "Sample Input", expectedOutput: "Sample Output" },
                { input: "Edge case input", expectedOutput: "Handled correctly" },
                { input: "Invalid input", expectedOutput: "Error / Graceful handling" }
            ],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        batch.set(docRef, newQuestion);
        count++;
      });
      
      setLog(prev => [...prev, `Preparing to commit ${count} questions to the database...`]);
      await batch.commit();
      
      setLog(prev => [...prev, `Successfully seeded ${count} questions for Python.`, 'Process complete!']);
      toast({ title: 'Database Seeded!', description: `${count} Python questions have been added.` });

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
          <CardTitle>Seed Python Questions</CardTitle>
          <CardDescription>
            This tool will populate the Firestore database with predefined Python questions. 
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
                  This action will add multiple documents to your Firestore database. Ensure the "Python" programming language exists in your courses before proceeding.
                </p>
              </div>
            </div>
          </div>
          <Button onClick={handleSeedDatabase} disabled={isSeeding}>
            {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Seeding Python Questions
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
