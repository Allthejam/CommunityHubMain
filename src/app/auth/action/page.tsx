
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { applyActionCode, type Auth } from 'firebase/auth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import Link from 'next/link';

function ActionHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const auth = useAuth();
    
    const mode = searchParams.get('mode');
    const actionCode = searchParams.get('oobCode');
    
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = React.useState('Verifying your email...');

    React.useEffect(() => {
        if (!auth || !mode || !actionCode) {
            // If essential parameters are missing, redirect to home.
            router.replace('/');
            return;
        }

        const handleAction = async (authInstance: Auth, actionCode: string) => {
            try {
                await applyActionCode(authInstance, actionCode);
                setStatus('success');
                setMessage('Your email has been successfully verified. You can now sign in with your new account.');
            } catch (error: any) {
                setStatus('error');
                let userMessage = 'An error occurred. The link may be invalid or expired.';
                if (error.code === 'auth/invalid-action-code') {
                    userMessage = 'The verification link is invalid or has expired. Please try signing up again or request a new verification email.';
                }
                setMessage(userMessage);
                console.error("Firebase action error:", error);
            }
        };

        if (mode === 'verifyEmail') {
            handleAction(auth, actionCode);
        } else {
            // Handle other modes like 'resetPassword' if needed in the future
            // For now, just redirect for any other mode.
            router.replace('/');
        }
    }, [auth, mode, actionCode, router]);

    if (status === 'loading') {
        return (
             <div className="flex items-center text-lg text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {message}
            </div>
        );
    }
    
    return (
        <Card className="w-full max-w-md">
            <CardHeader className="items-center text-center">
                <Logo className="mb-4 h-12 w-12 text-primary" />
                <CardTitle className="text-2xl flex items-center gap-2">
                    {status === 'success' ? <CheckCircle className="h-7 w-7 text-green-500" /> : <XCircle className="h-7 w-7 text-destructive" />}
                    {status === 'success' ? 'Email Verified!' : 'Verification Failed'}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground">{message}</p>
            </CardContent>
            <CardFooter className="justify-center">
                <Button asChild>
                    <Link href="/">Return to Login</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ActionPage() {
    // Suspense is needed because useSearchParams is used in ActionHandler
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <ActionHandler />
            </React.Suspense>
        </div>
    )
}
