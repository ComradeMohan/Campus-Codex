
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OtpVerificationDialogProps {
  phoneNumber: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Ensure window.recaptchaVerifier is available globally in the scope of this file
declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
        confirmationResult?: ConfirmationResult;
    }
}

export function OtpVerificationDialog({ phoneNumber, isOpen, onOpenChange }: OtpVerificationDialogProps) {
  const { toast } = useToast();
  const { refreshUserProfile } = useAuth();
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && recaptchaContainerRef.current && !window.recaptchaVerifier) {
      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
      });
      window.recaptchaVerifier = recaptchaVerifier;
    }
    // Cleanup on close
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, [isOpen]);

  const handleSendOtp = async () => {
    if (!phoneNumber || !window.recaptchaVerifier) {
      toast({ title: 'Error', description: 'Phone number or reCAPTCHA not ready.', variant: 'destructive' });
      return;
    }
    setIsSendingOtp(true);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${phoneNumber}.` });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      let desc = "Failed to send OTP. Please ensure your phone number is correct and try again.";
      if (error.code === 'auth/invalid-phone-number') {
        desc = "The provided phone number is not valid.";
      } else if (error.code === 'auth/too-many-requests') {
        desc = "Too many requests. Please try again later.";
      }
      toast({ title: 'Error', description: desc, variant: 'destructive' });
      window.recaptchaVerifier.render().then(widgetId => {
        grecaptcha.reset(widgetId);
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || !window.confirmationResult) {
      toast({ title: 'Error', description: 'Please enter the OTP.', variant: 'destructive' });
      return;
    }
    setIsVerifying(true);
    try {
      const result = await window.confirmationResult.confirm(otp);
      // User is now signed in and linked. We can now mark them as verified in our DB.
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { isEmailVerified: true });

      toast({ title: 'Verification Successful!', description: 'Your account has been verified. Welcome!' });
      
      // Refresh user profile in context to reflect verified status
      await refreshUserProfile(); 
      onOpenChange(false);
      setOtp('');
      setOtpSent(false);

    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      let desc = "Failed to verify OTP. Please try again.";
      if (error.code === 'auth/invalid-verification-code') {
          desc = "The OTP you entered is invalid. Please check and try again.";
      }
      toast({ title: 'Verification Failed', description: desc, variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Phone className="mr-2 h-5 w-5 text-primary" />
            Verify with Phone OTP
          </DialogTitle>
          <DialogDescription>
            {otpSent ? `Enter the 6-digit code sent to ${phoneNumber}.` : `We'll send a one-time password to your registered phone number: ${phoneNumber}.`}
          </DialogDescription>
        </DialogHeader>
        <div ref={recaptchaContainerRef}></div>
        
        {!otpSent ? (
          <div className="pt-4">
            <Button onClick={handleSendOtp} disabled={isSendingOtp} className="w-full">
              {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                    id="otp"
                    type="tel"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    autoComplete="one-time-code"
                />
            </div>
            <Button onClick={handleVerifyOtp} disabled={isVerifying} className="w-full">
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Log In
            </Button>
             <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setOtpSent(false)}>
                Didn't receive code? Send again.
            </Button>
          </div>
        )}

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSendingOtp || isVerifying}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
