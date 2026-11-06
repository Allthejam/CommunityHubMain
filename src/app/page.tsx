'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Auth, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, sendEmailVerification, type User } from 'firebase/auth'
import { Eye, EyeOff, Loader2, ArrowLeft, Megaphone, Info, Sparkles, Store, Users, Briefcase, ShieldAlert, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { Logo } from '@/components/icons'
import { useToast } from '@/hooks/use-toast'
import { collection, query, where } from 'firebase/firestore'
import { type Announcement } from '@/lib/announcement-data'
import { AnnouncementBanners } from '@/components/announcement-banners'
import { cn } from '@/lib/utils'

// New type for tracking login attempts
type LoginAttempt = {
  count: number;
  blockUntil: number | null;
};


export default function SignInPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  
  // State to manage login attempts
  const [loginAttempts, setLoginAttempts] = useState<Record<string, LoginAttempt>>({});

  const loginAnnouncementsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
        collection(db, "announcements"),
        where("scope", "==", "platform"),
        where("status", "==", "Live"),
        where("showOnLoginPage", "==", true)
    );
  }, [db]);

  const { data: loginAnnouncementsData, isLoading: announcementsLoading } = useCollection<Announcement>(loginAnnouncementsQuery);

  useEffect(() => {
    // Load login attempts from localStorage on component mount
    const storedAttempts = localStorage.getItem('loginAttempts');
    if (storedAttempts) {
        try {
            setLoginAttempts(JSON.parse(storedAttempts));
        } catch (e) {
            console.warn("Could not parse login attempts from storage.");
        }
    }
  }, []);

  useEffect(() => {
    // Redirect verified users to home
    if (!isUserLoading && user && user.emailVerified) {
      router.push('/home');
    }
  }, [user, isUserLoading, router]);


  const handleResendVerification = async () => {
    if (!auth || !email || !password) {
        toast({ title: "Error", description: "Email and password are required to resend verification.", variant: "destructive" });
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userToVerify = userCredential.user;

        if (userToVerify) {
            await sendEmailVerification(userToVerify);
            toast({
                title: "Verification Email Sent",
                description: "Please check your inbox for a new verification link.",
            });
            await auth.signOut();
            setShowResend(false);
        }
    } catch (error: any) {
        console.error("Resend verification error:", error);
        toast({
            title: "Error Sending Email",
            description: "Could not send verification email. Please ensure your credentials are correct.",
            variant: "destructive",
        });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setLoading(true);

    if (!auth) {
      setError('Authentication service is not available.');
      setLoading(false);
      return;
    }
    
    const now = Date.now();
    const attemptsInfo = loginAttempts[email] || { count: 0, blockUntil: null };

    if (attemptsInfo.blockUntil && now < attemptsInfo.blockUntil) {
        const timeLeft = Math.ceil((attemptsInfo.blockUntil - now) / (1000 * 60));
        setError(`Too many failed attempts. Please try again in ${timeLeft} minute(s).`);
        setLoading(false);
        return;
    }

    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // On successful login, purge any stale sandbox/demo session flags
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('visitedCommunityId');
        sessionStorage.removeItem('visitedCommunityName');
        sessionStorage.removeItem('isDemoMode');
        sessionStorage.removeItem('sandboxPersona');
      }

      // On successful login, reset attempts for this email
      const newAttempts = { ...loginAttempts };
      delete newAttempts[email];
      setLoginAttempts(newAttempts);
      localStorage.setItem('loginAttempts', JSON.stringify(newAttempts));

      if (!userCredential.user.emailVerified) {
        setError("Please verify your email before logging in. Check your inbox for a verification link.");
        setShowResend(true);
        await auth.signOut();
        setLoading(false);
        return;
      }
      
    } catch (e: any) {
      let errorMessage = 'An unknown error occurred.';
      
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        const newCount = (attemptsInfo.count || 0) + 1;
        let newBlockUntil = null;
        
        if (newCount === 2) {
            errorMessage = "Invalid credentials. You have one more attempt before a 5-minute cooldown.";
        } else if (newCount === 3) {
            newBlockUntil = now + 5 * 60 * 1000; // 5 minutes
            errorMessage = "Invalid credentials. Your account is temporarily locked for 5 minutes.";
        } else if (newCount > 3) {
            newBlockUntil = now + 60 * 60 * 1000; // 1 hour
            errorMessage = "Invalid credentials. Due to multiple failed attempts, your account is locked for 1 hour.";
        } else {
             errorMessage = 'Invalid email or password.';
        }

        const updatedAttempts = { ...loginAttempts, [email]: { count: newCount, blockUntil: newBlockUntil }};
        setLoginAttempts(updatedAttempts);
        localStorage.setItem('loginAttempts', JSON.stringify(updatedAttempts));

        setError(errorMessage);

      } else if (e.code === 'auth/too-many-requests') {
          setError("Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.");
      } else {
        setError(e.message);
      }
      setLoading(false);
    }
  }

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  const hasAnnouncements = loginAnnouncementsData && loginAnnouncementsData.length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-muted/20 to-background p-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <Card>
            <CardHeader className="items-center text-center">
                <Logo className="mb-2 h-10 w-10 text-primary" />
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>
                Sign in to your Community Hub account
                </CardDescription>
                {hasAnnouncements && (
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="link" className="text-sm">
                                <Megaphone className="mr-2 h-4 w-4" />
                                View Announcements
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                             <DialogHeader>
                                <DialogTitle>Platform Announcements</DialogTitle>
                            </DialogHeader>
                             <div className="py-4">
                                <AnnouncementBanners allAnnouncements={loginAnnouncementsData || []} />
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                    </div>
                    <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                        <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(!!checked)} />
                        <Label htmlFor="remember-me" className="text-sm font-normal">Remember me</Label>
                    </div>
                     <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                        Forgot your password?
                    </Link>
                </div>
                {error && (
                    <div className="text-sm font-medium text-destructive">
                    {error}{' '}
                    {showResend && (
                        <Button type="button" variant="link" className="p-0 h-auto text-destructive text-sm" onClick={handleResendVerification}>
                            Resend verification link.
                        </Button>
                    )}
                    </div>
                )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link href="/signup/account-type" className="font-medium text-primary hover:underline">
                    Sign Up
                    </Link>
                </div>
                 <div className="text-center text-xs text-muted-foreground">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-xs">Forgot your email?</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Forgot Your Email?</DialogTitle>
                                <DialogDescription>
                                    For security reasons, we cannot look up an account by name or other personal details.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <p className="text-sm">
                                If you have forgotten the email address associated with your account, please contact support by reporting an issue. Include your full name and any other details you remember. An administrator will assist you with account recovery.
                                </p>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Close</Button>
                                </DialogClose>
                                <Button asChild>
                                    <Link href="/report-issue">Contact Support</Link>
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="pt-2 border-t border-border/40 w-full flex flex-col items-center justify-center gap-1.5">
                    <Link
                        href="/public-directory"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-400 transition-colors py-1.5 px-3 rounded-full hover:bg-muted/50 border border-transparent hover:border-border/60 text-center"
                    >
                        <Store className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                        <span>Looking for local shops and services? <strong className="font-semibold text-teal-400 underline underline-offset-2">No login required. Browse Public Directory &rarr;</strong></span>
                    </Link>
                    <Link
                        href="/showcase"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-400 transition-colors py-1 px-3 rounded-full hover:bg-muted/50 border border-transparent hover:border-border/60"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Explore the <strong className="font-semibold text-emerald-400 underline underline-offset-2">Interactive Showcase & Demo</strong> (No Sign-Up)</span>
                    </Link>
                    <Link
                        href="/about?source=login"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 px-3 rounded-full hover:bg-muted/50 border border-transparent hover:border-border/60"
                    >
                        <Info className="h-3.5 w-3.5 text-primary/70" />
                        <span>Curious what Community Hub is all about? <strong className="font-semibold text-primary underline underline-offset-2">About Us</strong></span>
                    </Link>
                </div>
                </CardFooter>
            </form>
        </Card>
      </div>

      {/* Crawlable Public SEO Discovery Section */}
      <section aria-label="About Community Hub" className="w-full max-w-3xl mx-auto mt-10 pt-8 border-t border-border/50 text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Hyperlocal Civic Network & Digital High Street</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Connecting Towns, Villages & Local High Streets Across the UK
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Community Hub is an algorithm-free local platform bringing together residents, independent high street businesses, community councils, and regional authorities with complete data privacy and real-time civil emergency resilience.
          </p>
        </div>

        {/* 4 Quick Discovery Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {/* Card 1: Public Business Directory */}
          <Link
            href="/public-directory"
            className="group p-4 rounded-xl border bg-card/60 hover:bg-card hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <Store className="h-4 w-4" />
                <span>Public Business Directory</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Discover independent shops, local trades, dining, and stays across local communities with zero login required.
              </p>
            </div>
            <div className="mt-3 flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              <span>Browse Local Directory</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 2: Register a Local Business */}
          <Link
            href="/signup/business"
            className="group p-4 rounded-xl border bg-card/60 hover:bg-card hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Briefcase className="h-4 w-4" />
                <span>Register a Local Business</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Open a digital storefront, post special offers, announce new products, and reach verified local customers.
              </p>
            </div>
            <div className="mt-3 flex items-center text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
              <span>Open Business Account</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 3: Free Resident Account */}
          <Link
            href="/signup/personal"
            className="group p-4 rounded-xl border bg-card/60 hover:bg-card hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-semibold text-sm">
                <Users className="h-4 w-4" />
                <span>Resident Personal Account</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect with neighbours, view parish events, join community discussions, and receive vital emergency alert beacons.
              </p>
            </div>
            <div className="mt-3 flex items-center text-xs font-medium text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
              <span>Join as Resident</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 4: Community Leaders & Councils */}
          <Link
            href="/signup/leader"
            className="group p-4 rounded-xl border bg-card/60 hover:bg-card hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Community Councils & Leaders</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lead your town hub, coordinate ISO 22301-aligned civil resilience playbooks, and earn a 40% revenue share.
              </p>
            </div>
            <div className="mt-3 flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
              <span>Lead a Community</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>
        </div>

        {/* Semantic Navigation Footer */}
        <nav aria-label="Public Navigation" className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground border-t">
          <Link href="/public-directory" className="hover:text-emerald-600 transition-colors">
            Public Directory
          </Link>
          <Link href="/showcase" className="hover:text-foreground transition-colors">
            Interactive Showcase
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About Platform
          </Link>
          <Link href="/signup/account-type" className="hover:text-foreground transition-colors font-medium text-primary">
            All Account Types
          </Link>
          <Link href="/directory/advertise" className="hover:text-emerald-600 transition-colors">
            Advertise With Us
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms & Privacy
          </Link>
        </nav>
      </section>
    </div>
  )
}