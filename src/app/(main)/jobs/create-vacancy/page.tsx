
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Loader2,
    Save,
    ArrowLeft,
    FileText,
    Mail,
    Phone,
} from "lucide-react"
import { collection, query, where } from "firebase/firestore";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { postJobVacancyAction } from "@/lib/actions/jobActions";


type UserBusiness = {
    id: string;
    name: string;
    logoImage: string | null;
};

const jobTypes = [
  "Full Time",
  "Part Time",
  "Remote",
  "Shared",
  "Contract",
  "Self Employed",
  "Other",
];

export default function CreateVacancyPage() {
  const [userBusinesses, setUserBusinesses] = React.useState<UserBusiness[]>([]);
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const { toast } = useToast();
  const router = useRouter();


  // State for Job Vacancy Form
  const [vacancyBusinessId, setVacancyBusinessId] = React.useState("");
  const [vacancyOtherBusiness, setVacancyOtherBusiness] = React.useState("");
  const [vacancyJobTitle, setVacancyJobTitle] = React.useState("");
  const [vacancyJobType, setVacancyJobType] = React.useState("");
  const [vacancyShortDesc, setVacancyShortDesc] = React.useState("");
  const [vacancyLongDesc, setVacancyLongDesc] = React.useState("");
  const [vacancyWebsite, setVacancyWebsite] = React.useState("");
  const [applicationEmail, setApplicationEmail] = React.useState("");
  const [applicationPhone, setApplicationPhone] = React.useState("");
  const [indeedApplyUrl, setIndeedApplyUrl] = React.useState("");
  const [isSubmittingVacancy, setIsSubmittingVacancy] = React.useState(false);

  const userBusinessesQuery = useMemoFirebase(() => {
    if (!user?.uid || !db) return null;
    return query(collection(db, "businesses"), where("ownerId", "==", user.uid));
  }, [user?.uid, db]);

  const { data: rawUserBusinesses, isLoading: businessesLoading } = useCollection<any>(userBusinessesQuery);

  React.useEffect(() => {
      if (rawUserBusinesses) {
          const businessesData = rawUserBusinesses.map(
                (doc) => ({ id: doc.id, name: doc.businessName, logoImage: doc.logoImage || null } as UserBusiness)
            );
          setUserBusinesses(businessesData);
      }
  }, [rawUserBusinesses]);
  
  const handlePostVacancy = async () => {
    if (!user || !userProfile?.communityId) {
        toast({ title: "Error", description: "You must be logged in to post a vacancy.", variant: "destructive" });
        return;
    }

    const isOtherBusiness = vacancyBusinessId === 'other';
    const selectedBusiness = userBusinesses.find(b => b.id === vacancyBusinessId);
    const companyName = isOtherBusiness ? vacancyOtherBusiness : selectedBusiness?.name;
    const companyLogo = isOtherBusiness ? null : selectedBusiness?.logoImage;

    if (!companyName || !vacancyJobTitle || !vacancyShortDesc || !vacancyLongDesc) {
        toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
        return;
    }
    
    setIsSubmittingVacancy(true);
    
    const result = await postJobVacancyAction({
        title: vacancyJobTitle,
        company: companyName,
        companyLogo: companyLogo,
        businessId: isOtherBusiness ? null : vacancyBusinessId,
        jobType: vacancyJobType,
        shortDescription: vacancyShortDesc,
        fullDescription: vacancyLongDesc,
        website: vacancyWebsite,
        applicationEmail: applicationEmail,
        applicationPhone: applicationPhone,
        indeedApplyUrl: indeedApplyUrl,
        communityId: userProfile.communityId,
        ownerId: user.uid,
    });

    if (result.success) {
        toast({ title: "Success", description: "Your job vacancy has been posted." });
        router.push('/jobs');
    } else {
        toast({ title: "Error", description: result.error || "Could not post job vacancy.", variant: "destructive" });
    }
    
    setIsSubmittingVacancy(false);
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
                    <CardTitle className="flex items-center gap-2"><FileText /> Post a Job Vacancy</CardTitle>
                    <CardDescription>
                      Fill in the details below to post a new job listing.
                      Fields marked with an asterisk (*) are required.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 py-4 pr-6">
                    <div className="space-y-2">
                      <Label htmlFor="business-profile">
                        Business / Employer Name *
                      </Label>
                      <Select value={vacancyBusinessId} onValueChange={setVacancyBusinessId}>
                        <SelectTrigger id="business-profile">
                          <SelectValue placeholder="Select one of your businesses or 'Other'..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userBusinesses.map((business) => (
                            <SelectItem key={business.id} value={business.id}>
                              {business.name}
                            </SelectItem>
                          ))}
                           <SelectItem value="other">Other (e.g., Private Household)</SelectItem>
                        </SelectContent>
                      </Select>
                       {vacancyBusinessId === 'other' && (
                        <Input
                            id="other-business-name"
                            placeholder="Enter employer name (e.g., Private Household)"
                            value={vacancyOtherBusiness}
                            onChange={(e) => setVacancyOtherBusiness(e.target.value)}
                            className="mt-2"
                        />
                       )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="job-title">Job Title *</Label>
                        <Input id="job-title" placeholder="e.g., Barista" value={vacancyJobTitle} onChange={(e) => setVacancyJobTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-type">Job Type *</Label>
                      <Select value={vacancyJobType} onValueChange={setVacancyJobType}>
                        <SelectTrigger id="job-type">
                          <SelectValue placeholder="Select a job type" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTypes.map((type) => (
                            <SelectItem
                              key={type}
                              value={type.toLowerCase().replace(" ", "-")}
                            >
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="short-description">
                        Short Description (for listing) *
                      </Label>
                      <Textarea
                        id="short-description"
                        placeholder="A brief summary of the role..."
                        maxLength={150}
                        value={vacancyShortDesc}
                        onChange={(e) => setVacancyShortDesc(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="long-description">
                        Full Job Description *
                      </Label>
                      <Textarea
                        id="long-description"
                        placeholder="Provide full details about the job, responsibilities, and requirements..."
                        className="min-h-32"
                        value={vacancyLongDesc}
                        onChange={(e) => setVacancyLongDesc(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website-link">
                        Company Website or Social Media Link
                      </Label>
                      <Input
                        id="website-link"
                        type="url"
                        placeholder="https://example.com/careers"
                        value={vacancyWebsite}
                        onChange={(e) => setVacancyWebsite(e.target.value)}
                      />
                    </div>
                    <div className="space-y-4 pt-4 border-t">
                        <Label className="font-semibold text-base">Application Methods</Label>
                         <div className="grid gap-2">
                            <Label htmlFor="application-email">Application Email (for CVs)</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="application-email" type="email" placeholder="hr@example.com" value={applicationEmail} onChange={e => setApplicationEmail(e.target.value)} className="pl-10" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="application-phone">Application Phone Number</Label>
                             <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="application-phone" type="tel" placeholder="01234 567890" value={applicationPhone} onChange={e => setApplicationPhone(e.target.value)} className="pl-10" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="indeed-url">Indeed Application URL</Label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.84 6.204a2.23 2.23 0 0 0-3.15.019l-.03.03v-3.03h-2.1v9.6h2.1v-4.71c0-1.29.98-2.34 2.24-2.34a2.27 2.27 0 0 1 2.26 2.25v4.8h2.1v-4.93c0-2.4-1.92-4.62-4.42-4.62zM3.48 3.424c-1.08 0-1.92.84-1.92 1.92s.84 1.92 1.92 1.92c1.14 0 1.92-.84 1.92-1.92s-.78-1.92-1.92-1.92zm1.08 16.536h-2.1V9.244h2.1v10.716z"/></svg>
                                <Input id="indeed-url" type="url" placeholder="https://www.indeed.com/job/..." value={indeedApplyUrl} onChange={e => setIndeedApplyUrl(e.target.value)} className="pl-10"/>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handlePostVacancy} disabled={isSubmittingVacancy}>
                        {isSubmittingVacancy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Post Job Listing
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

