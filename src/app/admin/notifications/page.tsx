
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ArrowLeft, AlertTriangle } from 'lucide-react';

const notificationFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title cannot exceed 100 characters."),
  body: z.string().min(10, "Message must be at least 10 characters.").max(500, "Message cannot exceed 500 characters."),
  targetAudience: z.enum(['all', 'students', 'faculty'], { required_error: "Please select a target audience."}),
});

type NotificationFormData = z.infer<typeof notificationFormSchema>;

export default function AdminNotificationsPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: '',
      body: '',
      targetAudience: undefined,
    },
  });

  const onSubmit = async (data: NotificationFormData) => {
    if (!userProfile?.collegeId) {
      toast({ title: "Error", description: "Admin context not found.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const notificationData = {
        ...data,
        collegeId: userProfile.collegeId,
        sentBy: userProfile.uid,
        createdAt: serverTimestamp(),
        status: 'pending', // A backend function would process this
      };

      // Add to a top-level 'notifications' collection for a Cloud Function to listen to
      await addDoc(collection(db, 'notifications'), notificationData);

      toast({
        title: "Notification Queued!",
        description: "Your notification has been queued for sending via a backend process.",
      });
      form.reset();
    } catch (error) {
      console.error("Error queueing notification:", error);
      toast({ title: "Error", description: "Failed to queue notification. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-headline flex items-center">
          <Send className="w-8 h-8 mr-3 text-primary" />
          Send Notifications
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Compose Notification</CardTitle>
          <CardDescription>Create and send a push notification to users in your college.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Important Announcement" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem><FormLabel>Message Body</FormLabel><FormControl><Textarea placeholder="Enter your notification message here..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select who should receive this" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Users in College</SelectItem>
                        <SelectItem value="students">Only Students</SelectItem>
                        <SelectItem value="faculty">Only Faculty</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-4">
                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Queue Notification for Sending
                </Button>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5"/>
                    <span>
                        <strong>Note:</strong> This form queues a notification in Firestore. A backend process (like a Firebase Cloud Function), which is not part of this prototype, is required to actually fetch user tokens and send the push notifications.
                    </span>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
