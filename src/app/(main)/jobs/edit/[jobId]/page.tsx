'use client';

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
    Loader2,
    Save,
    ArrowLeft,
    FileText,
    Mail,
    Phone,
    Banknote,
    Linkedin,
    Upload,
    Camera,
    X,
    Building2,
} from "lucide-react"
import { collection, query, where, doc } from "firebase/firestore";

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
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { updateJobVacancyAction } from "@/lib/actions/jobActions";
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RichTextEditor } from "@/components/rich-text-editor";

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

const payFrequencies = [
  { value: "hourly", label: "per hour" },
  { value: "weekly", label: "per week" },
  { value: "fortnightly", label: "per fortnight" },
  { value: "monthly", label: "per month" },
  { value: "yearly", label: "per year" },
];

export default function EditVacancyPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const params = useParams();
  const jobId = params.jobId as string;
  const { toast } = useToast();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const jobRef = useMemoFirebase(() => (jobId ? doc(db, 'jobs', jobId) : null), [jobId, db]);
  const { data: existingJob, isLoading: jobLoading } = useDoc<any>(jobRef);

  // Form State
  const [vacancyBusinessId, setVacancyBusinessId] = React.useState("");
  const [vacancyOtherBusiness, setVacancyOtherBusiness] = React.useState("");
  const [vacancyJobTitle, setVacancyJobTitle] = React.useState("");
  const [vacancyJobType, setVacancyJobType] = React.useState("");
  const [vacancySalary, setVacancySalary] = React.useState("");
  const [vacancySalaryFrequency, setVacancySalaryFrequency] = React.useState("yearly");
  const [vacancyShortDesc, setVacancyShortDesc] = React.useState("");
  const [vacancyLongDesc, setVacancyLongDesc] = React.useState("");
  const [vacancyWebsite, setVacancyWebsite] = React.useState("");
  const [applicationEmail, setApplicationEmail] = React.useState("");
  const [applicationPhone, setApplicationPhone] = React.useState("");
  const [indeedApplyUrl, setIndeedApplyUrl] = React.useState("");
  const [linkedinApplyUrl, setLinkedinApplyUrl] = React.useState("");
  const [customLogo, setCustomLogo] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const userBusinessesQuery = useMemoFirebase(() => {
    if (!user?.uid || !db) return null;
    return query(collection(db, "businesses"), where("ownerId", "==", user.uid));
  }, [user?.uid, db]);

  const { data: userBusinesses, isLoading: businessesLoading } = useCollection<any>(userBusinessesQuery);

  React.useEffect(() => {
      if (existingJob) {
          setVacancyBusinessId(existingJob.businessId || "other");
          setVacancyOtherBusiness(existingJob.company || "");
          setVacancyJobTitle(existingJob.title || "");
          setVacancyJobType(existingJob.jobType || "");
          
          const salaryParts = (existingJob.salary || "").split(" ");
          if (salaryParts.length >= 2) {
              setVacancySalary(salaryParts[0].replace("£", ""));
              const freqLabel = salaryParts.slice(1).join(" ");
              const freqValue = payFrequencies.find(f => f.label === freqLabel)?.value || "yearly";
              setVacancySalaryFrequency(freqValue);
          }

          setVacancyShortDesc(existingJob.shortDescription || "");
          setVacancyLongDesc(existingJob.fullDescription || "");
          setVacancyWebsite(existingJob.website || "");
          setApplicationEmail(existingJob.applicationEmail || "");
          setApplicationPhone(existingJob.applicationPhone || "");
          setIndeedApplyUrl(existingJob.indeedApplyUrl || "");
          setLinkedinApplyUrl(existingJob.linkedinApplyUrl || "");
          setCustomLogo(existingJob.companyLogo || null);
      }
  }, [existingJob]);

  const handleUpdate = async () => {
    if (!user || !jobId) return;

    setIsSubmitting(true);
    
    const formattedSalary = vacancySalary ? `£${vacancySalary} ${payFrequencies.find(f => f.value === vacancySalaryFrequency)?.label || 'per year'}` : "Not specified";

    const result = await updateJobVacancyAction(jobId, {
        title: vacancyJobTitle,
        company: vacancyBusinessId === 'other' ? vacancyOtherBusiness : userBusinesses?.find(b => b.id === vacancyBusinessId)?.businessName,
        companyLogo: customLogo,
        businessId: vacancyBusinessId === 'other' ? null : vacancyBusinessId,
        jobType: vacancyJobType,
        salary: formattedSalary,
        shortDescription: vacancyShortDesc,
        fullDescription: vacancyLongDesc,
        website: vacancyWebsite,
        applicationEmail,
        applicationPhone,
        indeedApplyUrl,
        linkedinApplyUrl,
        ownerId: user.uid,
    });

    if (result.success) {
        toast({ title: "Vacancy Updated" });
        router.push('/jobs');
    } else {
        toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setCustomLogo(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  if (jobLoading || businessesLoading) {
      return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
        <div>
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/jobs">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Board
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2"><FileText /> Edit Job Vacancy</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Vacancy Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="business-profile">Employer</Label>
                    <Select value={vacancyBusinessId} onValueChange={setVacancyBusinessId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select employer..." />
                        </SelectTrigger>
                        <SelectContent>
                            {userBusinesses?.map((biz) => (
                                <SelectItem key={biz.id} value={biz.id}>{biz.businessName}</SelectItem>
                            ))}
                            <SelectItem value="other">Other...</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {vacancyBusinessId === 'other' && (
                    <div className="space-y-4 pt-2">
                         <div className="space-y-2">
                            <Label htmlFor="other-business-name">Employer Name</Label>
                            <Input 
                                id="other-business-name" 
                                value={vacancyOtherBusiness} 
                                onChange={e => setVacancyOtherBusiness(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Employer Logo</Label>
                            <div className="flex items-center gap-4">
                                {customLogo && (
                                    <div className="relative h-20 w-20 border rounded-md overflow-hidden">
                                        <Image src={customLogo} alt="Logo" fill className="object-contain" />
                                    </div>
                                )}
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" /> Upload Logo
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="job-title">Job Title *</Label>
                        <Input id="job-title" value={vacancyJobTitle} onChange={e => setVacancyJobTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="job-type">Job Type *</Label>
                        <Select value={vacancyJobType} onValueChange={setVacancyJobType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jobTypes.map(type => (
                                    <SelectItem key={type} value={type.toLowerCase().replace(" ", "-")}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                    <div className="space-y-2">
                        <Label htmlFor="salary-amount">Salary Amount (£)</Label>
                        <Input id="salary-amount" type="number" value={vacancySalary} onChange={e => setVacancySalary(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="salary-frequency">Frequency</Label>
                        <Select value={vacancySalaryFrequency} onValueChange={setVacancySalaryFrequency}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {payFrequencies.map(freq => (
                                    <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="short-desc">Short Description *</Label>
                    <Textarea id="short-desc" value={vacancyShortDesc} onChange={e => setVacancyShortDesc(e.target.value)} maxLength={150} />
                </div>
                <div className="space-y-2">
                    <Label>Full Job Description *</Label>
                    <RichTextEditor value={vacancyLongDesc} onChange={setVacancyLongDesc} />
                </div>
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold">Application Methods</h3>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="app-email">Email</Label>
                            <Input id="app-email" type="email" value={applicationEmail} onChange={e => setApplicationEmail(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="app-phone">Phone</Label>
                            <Input id="app-phone" type="tel" value={applicationPhone} onChange={e => setApplicationPhone(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="indeed-url">Indeed URL</Label>
                            <Input id="indeed-url" type="url" value={indeedApplyUrl} onChange={e => setIndeedApplyUrl(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="linkedin-url">LinkedIn URL</Label>
                            <Input id="linkedin-url" type="url" value={linkedinApplyUrl} onChange={e => setLinkedinApplyUrl(e.target.value)} />
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleUpdate} disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
