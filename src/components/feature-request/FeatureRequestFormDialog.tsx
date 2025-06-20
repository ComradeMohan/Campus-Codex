
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, FeatureRequest, FeatureRequestCategory } from '@/types';
import { Loader2, Lightbulb } from 'lucide-react';

interface FeatureRequestFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

const featureCategories: FeatureRequestCategory[] = [
  'New Feature',
  'UI/UX Improvement',
  'Bug Report',
  'Performance',
  'AI Feature',
  'Other',
];

const featureRequestFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters.' }).max(100, { message: 'Title cannot exceed 100 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }).max(1500, { message: 'Description cannot exceed 1500 characters.' }),
  category: z.enum(featureCategories as [FeatureRequestCategory, ...FeatureRequestCategory[]], {
    required_error: 'Please select a category.',
  }),
});

type FeatureRequestFormData = z.infer<typeof featureRequestFormSchema>;

export function FeatureRequestFormDialog({ isOpen, onOpenChange, userProfile }: FeatureRequestFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeatureRequestFormData>({
    resolver: zodResolver(featureRequestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined,
    },
  });

  const handleSubmitRequest = async (data: FeatureRequestFormData) => {
    if (!userProfile || !userProfile.uid) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a feature request.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const requestData: Omit<FeatureRequest, 'id' | 'submittedAt' | 'status' > = {
        userId: userProfile.uid,
        userEmail: userProfile.email,
        userRole: userProfile.role,
        title: data.title,
        description: data.description,
        category: data.category,
      };

      await addDoc(collection(db, 'featureRequests'), {
        ...requestData,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });

      toast({
        title: 'Feature Request Submitted!',
        description: 'Thank you! Your suggestion has been recorded.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting feature request:', error);
      toast({
        title: 'Submission Error',
        description: error.message || 'Failed to submit your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-primary" />
            Suggest a Feature or Report an Issue
          </DialogTitle>
          <DialogDescription>
            Have an idea to improve Campus Codex or found something that needs fixing? Let us know!
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitRequest)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title / Summary</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Add dark mode for sandbox" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {featureCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe your suggestion or issue in detail. If it's a bug, include steps to reproduce if possible."
                      {...field}
                      rows={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
