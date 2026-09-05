'use client';

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
    Loader2,
    Save,
    ArrowLeft,
    UserPlus,
} from "lucide-react"

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { updateJobSeekerProfileAction, getJobSeekerAction } from "@/lib/actions/jobActions";
import { RichTextEditor } from "@/components/rich-text-editor";

export default function EditSeekerPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const params = useParams();
    const seekerId = params.seekerId as string;
    const { toast } = useToast();
    const router = useRouter();

    const isDemo = typeof window !== 'undefined' && (
        window.location.pathname.startsWith('/demo') ||
        sessionStorage.getItem('visitedCommunityId') === '9ayHMyZf4SRw2gof1AM9' ||
        sessionStorage.getItem('visitedCommunityId') === 'c_showhome' ||
        sessionStorage.getItem('isDemoMode') === 'true'
    );
    const demoPrefix = isDemo ? '/demo' : '';

    const seekerRef = useMemoFirebase(() => (isDemo || !seekerId || !db ? null : doc(db, 'jobSeekers', seekerId)), [seekerId, db, isDemo]);
    const { data: firestoreSeeker, isLoading: seekerLoading } = useDoc<any>(seekerRef);

    const [demoSeeker, setDemoSeeker] = React.useState<any>(null);
    const [isDemoSeekerLoading, setIsDemoSeekerLoading] = React.useState(false);

    const [seekerName, setSeekerName] = React.useState("");
    const [seekerSummary, setSeekerSummary] = React.useState("");
    const [seekerProfile, setSeekerProfile] = React.useState("");
    const [seekerAvailableFrom, setSeekerAvailableFrom] = React.useState<Date>();
    const [seekerLinkedIn, setSeekerLinkedIn] = React.useState("");
    const [seekerPortfolio, setSeekerPortfolio] = React.useState("");
    const [seekerEmail, setSeekerEmail] = React.useState("");
    const [seekerPhone, setSeekerPhone] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    React.useEffect(() => {
        if (seekerId) {
            const cid = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') || '9ayHMyZf4SRw2gof1AM9' : '9ayHMyZf4SRw2gof1AM9';
            const localKey = `demo_job_seekers_${cid}`;
            const localSeekers = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem(localKey) || '[]') : [];
            const found = localSeekers.find((s: any) => s.id === seekerId);
            if (found) {
                setDemoSeeker(found);
            } else {
                setIsDemoSeekerLoading(true);
                getJobSeekerAction(seekerId, cid).then(res => {
                    if (res.success && res.data) {
                        setDemoSeeker(res.data);
                    }
                }).finally(() => setIsDemoSeekerLoading(false));
            }
        }
    }, [seekerId]);

    const existingSeeker = isDemo ? (demoSeeker || firestoreSeeker) : (firestoreSeeker || demoSeeker);

    React.useEffect(() => {
        if (existingSeeker) {
            setSeekerName(existingSeeker.name || "");
            setSeekerSummary(existingSeeker.summary || "");
            setSeekerProfile(existingSeeker.profile || "");
            
            const avail = existingSeeker.availableFrom?.toDate ? existingSeeker.availableFrom.toDate() : (existingSeeker.availableFrom ? new Date(existingSeeker.availableFrom) : undefined);
            setSeekerAvailableFrom(avail);
            setSeekerLinkedIn(existingSeeker.linkedin || "");
            setSeekerPortfolio(existingSeeker.portfolio || "");
            setSeekerEmail(existingSeeker.email || "");
            setSeekerPhone(existingSeeker.phone || "");
        }
    }, [existingSeeker]);
    
    const handleUpdate = async () => {
        const effectiveUserId = user?.uid || (isDemo ? 'demo-personal' : null);
        const effectiveCommunityId = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') || '9ayHMyZf4SRw2gof1AM9' : '9ayHMyZf4SRw2gof1AM9';

        if (!effectiveUserId || !seekerId) return;

        setIsSubmitting(true);
        const result = await updateJobSeekerProfileAction(seekerId, {
            name: seekerName,
            summary: seekerSummary,
            profile: seekerProfile,
            availableFrom: seekerAvailableFrom,
            linkedin: seekerLinkedIn,
            portfolio: seekerPortfolio,
            email: seekerEmail,
            phone: seekerPhone,
            communityId: effectiveCommunityId,
        });
        
        if (result.success) {
            if (isDemo && typeof window !== 'undefined' && effectiveCommunityId) {
                const localKey = `demo_job_seekers_${effectiveCommunityId}`;
                const localSeekers = JSON.parse(sessionStorage.getItem(localKey) || '[]');
                const idx = localSeekers.findIndex((s: any) => s.id === seekerId);
                if (idx >= 0) {
                    localSeekers[idx] = {
                        ...localSeekers[idx],
                        name: seekerName,
                        summary: seekerSummary,
                        profile: seekerProfile,
                        availableFrom: seekerAvailableFrom?.toISOString(),
                        linkedin: seekerLinkedIn,
                        portfolio: seekerPortfolio,
                        email: seekerEmail,
                        phone: seekerPhone,
                    };
                    sessionStorage.setItem(localKey, JSON.stringify(localSeekers));
                    window.dispatchEvent(new CustomEvent('demo_jobs_updated'));
                }
            }
            toast({ title: "Profile Updated" });
            router.push(`${demoPrefix}/jobs`);
        } else {
            toast({ title: "Update Failed", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    if (seekerLoading || isUserLoading || isDemoSeekerLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto py-8">
            <Button asChild variant="ghost" className="mb-4">
                <Link href={`${demoPrefix}/jobs`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Board
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus/> Edit Job Seeker Profile</CardTitle>
                    <CardDescription>Update your skills and availability.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 py-4 pr-6">
                    <div className="space-y-2">
                      <Label htmlFor="seeker-name">Full Name *</Label>
                      <Input id="seeker-name" value={seekerName} onChange={e => setSeekerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-short-desc">Short Profile Summary *</Label>
                      <Textarea id="seeker-short-desc" maxLength={150} value={seekerSummary} onChange={e => setSeekerSummary(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-long-desc">Detailed Profile / Experience</Label>
                      <RichTextEditor value={seekerProfile} onChange={setSeekerProfile} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="available-from">Available From</Label>
                      <DatePicker date={seekerAvailableFrom} setDate={setSeekerAvailableFrom} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-linkedin">LinkedIn Profile URL</Label>
                      <Input id="seeker-linkedin" type="url" value={seekerLinkedIn} onChange={e => setSeekerLinkedIn(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-social">Portfolio URL</Label>
                      <Input id="seeker-social" type="url" value={seekerPortfolio} onChange={e => setSeekerPortfolio(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-email">Contact Email</Label>
                      <Input id="seeker-email" type="email" value={seekerEmail} onChange={e => setSeekerEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-phone">Contact Phone</Label>
                      <Input id="seeker-phone" type="tel" value={seekerPhone} onChange={e => setSeekerPhone(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
