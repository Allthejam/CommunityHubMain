
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { postJobSeekerProfileAction } from "@/lib/actions/jobActions";

export default function CreateSeekerPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const { toast } = useToast();
    const router = useRouter();


    const [seekerName, setSeekerName] = React.useState("");
    const [seekerSummary, setSeekerSummary] = React.useState("");
    const [seekerProfile, setSeekerProfile] = React.useState("");
    const [seekerAvailableFrom, setSeekerAvailableFrom] = React.useState<Date>();
    const [seekerLinkedIn, setSeekerLinkedIn] = React.useState("");
    const [seekerPortfolio, setSeekerPortfolio] = React.useState("");
    const [seekerEmail, setSeekerEmail] = React.useState("");
    const [seekerPhone, setSeekerPhone] = React.useState("");
    const [isSubmittingSeeker, setIsSubmittingSeeker] = React.useState(false);
    
    React.useEffect(() => {
        if (userProfile) {
            setSeekerName(userProfile.name);
            setSeekerEmail(userProfile.email);
        }
    }, [userProfile]);
    
    const handlePostSeekerProfile = async () => {
        if (!user || !userProfile?.communityId) {
            toast({ title: "Error", description: "You must be logged in to create a profile.", variant: "destructive" });
            return;
        }
        if (!seekerName || !seekerSummary) {
            toast({ title: "Missing Information", description: "Name and summary are required.", variant: "destructive" });
            return;
        }

        setIsSubmittingSeeker(true);

        const result = await postJobSeekerProfileAction({
            name: seekerName,
            summary: seekerSummary,
            profile: seekerProfile,
            availableFrom: seekerAvailableFrom,
            linkedin: seekerLinkedIn,
            portfolio: seekerPortfolio,
            email: seekerEmail,
            phone: seekerPhone,
            communityId: userProfile.communityId,
            ownerId: user.uid,
        });
        
        if (result.success) {
            toast({ title: "Success", description: "Your job seeker profile has been posted." });
            router.push('/jobs');
        } else {
            toast({ title: "Error", description: result.error || "Could not post your profile.", variant: "destructive" });
        }

        setIsSubmittingSeeker(false);
    };

    return (
        <div className="space-y-8">
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/jobs">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Board
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus/> Create Job Seeker Profile</CardTitle>
                    <CardDescription>
                      Create a public profile to showcase your skills. Fields
                      marked with an asterisk (*) are required.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 py-4 pr-6">
                    <div className="space-y-2">
                      <Label htmlFor="seeker-name">Full Name *</Label>
                      <Input id="seeker-name" placeholder="e.g., John Doe" value={seekerName} onChange={e => setSeekerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-short-desc">
                        Short Profile Summary *
                      </Label>
                      <Textarea
                        id="seeker-short-desc"
                        placeholder="A brief, one-sentence summary about you..."
                        maxLength={150}
                        value={seekerSummary} onChange={e => setSeekerSummary(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-long-desc">
                        Detailed Profile / Experience
                      </Label>
                      <Textarea
                        id="seeker-long-desc"
                        placeholder="Describe your experience, skills, and what you're looking for..."
                        className="min-h-32"
                        value={seekerProfile} onChange={e => setSeekerProfile(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="available-from">Available From</Label>
                      <DatePicker
                        date={seekerAvailableFrom}
                        setDate={setSeekerAvailableFrom}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-linkedin">
                        LinkedIn Profile URL (Recommended)
                      </Label>
                      <Input
                        id="seeker-linkedin"
                        type="url"
                        placeholder="https://linkedin.com/in/your-profile"
                        value={seekerLinkedIn} onChange={e => setSeekerLinkedIn(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-social">
                        Other Social Media / Portfolio URL
                      </Label>
                      <Input
                        id="seeker-social"
                        type="url"
                        placeholder="https://github.com/your-profile"
                        value={seekerPortfolio} onChange={e => setSeekerPortfolio(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-email">Contact Email</Label>
                      <Input
                        id="seeker-email"
                        type="email"
                        placeholder="your-contact-email@example.com"
                         value={seekerEmail} onChange={e => setSeekerEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seeker-phone">Contact Phone</Label>
                      <Input
                        id="seeker-phone"
                        type="tel"
                        placeholder="Your contact phone number"
                        value={seekerPhone} onChange={e => setSeekerPhone(e.target.value)}
                      />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handlePostSeekerProfile} disabled={isSubmittingSeeker}>
                        {isSubmittingSeeker && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Submit Profile
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
