
'use client';

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, KeyRound } from 'lucide-react';

interface ChangePasswordDialogProps {
  email: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ email, isOpen, onOpenChange }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Email address not found. Cannot send reset link.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: `A password reset link has been sent to ${email}. Please check your inbox to set a new password.`,
      });
      onOpenChange(false); // Close dialog on success
    } catch (error: any) {
      console.error('Change password error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5 text-primary" />
            Change Your Password
          </DialogTitle>
          <DialogDescription>
            To change your password, we will send a secure link to your registered email address: <strong>{email || 'N/A'}</strong>.
            Click the link in the email to set a new password.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleChangePassword} disabled={isLoading || !email}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
