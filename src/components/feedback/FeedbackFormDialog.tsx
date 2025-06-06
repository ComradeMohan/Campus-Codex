
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile, Feedback } from '@/types';
import { Loader2, MessageSquarePlus } from 'lucide-react';

interface FeedbackFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studentProfile: UserProfile | null;
}

const feedbackFormSchema = z.object({
  feedbackText: z.string().min(10, { message: 'Feedback must be at least 10 characters.' }).max(1000, { message: 'Feedback cannot exceed 1000 characters.' }),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

export function FeedbackFormDialog({ isOpen, onOpenChange, studentProfile }: FeedbackFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedbackText: '',
    },
  });

  const handleSubmitFeedback = async (data: FeedbackFormData) => {
    if (!studentProfile || !studentProfile.uid || !studentProfile.collegeId) {
      toast({
        title: 'Error',
        description: 'Cannot submit feedback. User or college information is missing.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const feedbackData: Omit<Feedback, 'id' | 'createdAt'> = {
        studentUid: studentProfile.uid,
        studentName: studentProfile.fullName,
        studentEmail: studentProfile.email || 'N/A',
        collegeId: studentProfile.collegeId,
        feedbackText: data.feedbackText,
        isRead: false,
      };

      const feedbackCollectionRef = collection(db, 'colleges', studentProfile.collegeId, 'feedback');
      await addDoc(feedbackCollectionRef, {
        ...feedbackData,
        createdAt: serverTimestamp(),
      });

      // Update the college document to indicate new feedback
      const collegeDocRef = doc(db, 'colleges', studentProfile.collegeId);
      await updateDoc(collegeDocRef, {
        hasUnreadFeedback: true,
      });

      toast({
        title: 'Feedback Submitted!',
        description: 'Thank you for your feedback. We appreciate your input.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Submission Error',
        description: error.message || 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageSquarePlus className="mr-2 h-5 w-5 text-primary" />
            Submit Your Feedback
          </DialogTitle>
          <DialogDescription>
            We value your opinion! Please let us know your thoughts, suggestions, or any issues you've encountered.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitFeedback)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="feedbackText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us what you think..."
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
                Submit Feedback
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
