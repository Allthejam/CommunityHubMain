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
import { updateJobSeekerProfileAction } from "@/lib/actions/jobActions";
import { RichTextEditor } from "@/components/rich-text-editor";

export default function EditSeekerPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const params = useParams();
    const seekerId = params.seekerId as string;
    const { toast } = useToast();
    const router = useRouter();

    const seekerRef = useMemoFirebase(() => (seekerId ? doc(db, 'jobSeekers', seekerId) : null), [seekerId, db]);
    const { data: existingSeeker, isLoading: seekerLoading } = useDoc<any>(seekerRef);

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
        if (existingSeeker) {
            setSeekerName(existingSeeker.name || "");
            setSeekerSummary(existingSeeker.summary || "");
            setSeekerProfile(existingSeeker.profile || "");
            setSeekerAvailableFrom(existingSeeker.availableFrom?.toDate ? existingSeeker.availableFrom.toDate() : undefined);
            setSeekerLinkedIn(existingSeeker.linkedin || "");
            setSeekerPortfolio(existingSeeker.portfolio || "");
            setSeekerEmail(existingSeeker.email || "");
            setSeekerPhone(existingSeeker.phone || "");
        }
    }, [existingSeeker]);
    
    const handleUpdate = async () => {
        if (!user || !seekerId) return;

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
        });
        
        if (result.success) {
            toast({ title: "Profile Updated" });
            router.push('/jobs');
        } else {
            toast({ title: "Update Failed", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    if (seekerLoading || isUserLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto py-8">
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/jobs">
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
