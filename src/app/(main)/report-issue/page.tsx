

'use client';

import { useState, useRef, useEffect, useTransition, Suspense } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createReportAction } from '@/lib/actions/reportActions';
import { Loader2, ShieldQuestion, Users, Upload, Camera, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useSearchParams } from 'next/navigation';

export const communityReportCategories = [
    "Request an Event",
    "Report a member",
    "Report a community Issue",
    "Report damage in the community",
    "Report a crime",
    "Request an update",
    "Other"
];

export const platformReportCategories = [
    "Request a Private Hub",
    "Report an APP Issue",
    "Report a community member",
    "report a community leader",
    "report a crime",
    "Request an update",
    "request a call back",
    "Request a new community",
];

const severityLevels = ["Low", "Medium", "High"];

type ReportData = {
    subject: string;
    category: string;
    description: string;
    image: string | null;
    anonymous: boolean;
    contactPreference: string;
    contactDetail: string;
    severity?: 'Low' | 'Medium' | 'High';
};

const initialReportState: ReportData = {
    subject: '',
    category: '',
    description: '',
    image: null,
    anonymous: false,
    contactPreference: 'chat',
    contactDetail: '',
    severity: undefined,
};

function ReportIssueContent() {
    const { user } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [communityReport, setCommunityReport] = useState<ReportData>(initialReportState);
    const [platformReport, setPlatformReport] = useState<ReportData>(initialReportState);
    const [isCommunitySubmitting, startCommunityTransition] = useTransition();
    const [isPlatformSubmitting, startPlatformTransition] = useTransition();

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [activeCameraFor, setActiveCameraFor] = useState<'community' | 'platform' | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState('community');
    
    useEffect(() => {
        const postId = searchParams.get('postId');
        const subjectParam = searchParams.get('subject');
        const tabParam = searchParams.get('tab');
        
        let subjectText = '';
        if (postId) {
            subjectText = `Regarding post: ${postId}`;
        } else if (subjectParam) {
            subjectText = subjectParam;
        }

        if (tabParam === 'platform') {
            setActiveTab('platform');
            if (subjectText) {
                setPlatformReport(prev => ({ ...prev, subject: subjectText, category: subjectParam === 'Request a Private Hub' ? 'Request a Private Hub' : prev.category }));
            }
        } else {
             if (subjectText) {
                setCommunityReport(prev => ({ ...prev, subject: subjectText }));
            }
        }
    }, [searchParams]);

    const handleCommunityChange = (field: keyof ReportData, value: any) => {
        setCommunityReport(prev => ({ ...prev, [field]: value }));
    };

    const handlePlatformChange = (field: keyof ReportData, value: any) => {
        setPlatformReport(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (communityReport.contactPreference === 'email' && userProfile?.email) {
            handleCommunityChange('contactDetail', userProfile.email);
        } else if (communityReport.contactPreference !== 'email') {
            handleCommunityChange('contactDetail', '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [communityReport.contactPreference, userProfile?.email]);

    useEffect(() => {
        if (platformReport.contactPreference === 'email' && userProfile?.email) {
            handlePlatformChange('contactDetail', userProfile.email);
        } else if (platformReport.contactPreference !== 'email') {
            handlePlatformChange('contactDetail', '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platformReport.contactPreference, userProfile?.email]);

    useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (error) {
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({ variant: "destructive", title: "Camera Access Denied", description: "Please enable camera permissions in your browser settings." });
                }
            };
            getCameraPermission();
        } else if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    }, [isCameraOpen, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            if (activeCameraFor === 'community') handleCommunityChange('image', dataUrl);
            else if (activeCameraFor === 'platform') handlePlatformChange('image', dataUrl);

            setIsCameraOpen(false);
            setActiveCameraFor(null);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, reportType: 'community' | 'platform') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reportType === 'community') handleCommunityChange('image', reader.result as string);
                else handlePlatformChange('image', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const submitReport = (reportType: 'community' | 'platform') => {
        if (!user || !userProfile) return;
        const reportData = reportType === 'community' ? communityReport : platformReport;
        
        if (!reportData.category || !reportData.subject || !reportData.description) {
            toast({ title: 'Missing Fields', description: 'Please fill out all required fields.', variant: 'destructive' });
            return;
        }

        const transition = reportType === 'community' ? startCommunityTransition : startPlatformTransition;
        
        transition(async () => {
            const result = await createReportAction({
                userId: user.uid,
                communityId: reportType === 'community' ? userProfile.communityId : null,
                subject: reportData.subject,
                description: reportData.description,
                category: reportData.category,
                reportType,
                userName: reportData.anonymous ? 'Anonymous' : userProfile.name,
                image: reportData.image,
                contactPreference: reportData.contactPreference,
                contactDetail: reportData.contactDetail,
                severity: reportData.severity,
            });
            if (result.success) {
                toast({ title: 'Report Sent', description: `Your issue has been sent to the ${reportType === 'community' ? 'community leader' : 'platform administrators'}.` });
                if(reportType === 'community') {
                    setCommunityReport(initialReportState);
                } else {
                    setPlatformReport(initialReportState);
                }
                setIsCameraOpen(false);
                setActiveCameraFor(null);
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };
    
    return (
        <>
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <ShieldQuestion className="h-8 w-8" />
                    Report an Issue
                </h1>
                <p className="text-muted-foreground">
                    Having trouble? Let us know. Use the appropriate form below to direct your issue to the right people.
                </p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                        value="community"
                        className="transition-all data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Report to Community Leader
                    </TabsTrigger>
                    <TabsTrigger
                        value="platform"
                        className="transition-all data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:bg-red-50 dark:data-[state=active]:bg-red-900/20 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-300"
                    >
                         <ShieldQuestion className="mr-2 h-4 w-4" />
                        Report to Platform Admin
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="community">
                    <Card className="shadow-[0_0_15px_rgba(59,130,246,0.2)] dark:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                        <CardHeader>
                            <CardTitle>Community-Level Issues</CardTitle>
                            <CardDescription>
                                Use this form for issues related to your specific community, such as content moderation, local business inquiries, or questions about community events.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="community-category">Category *</Label>
                                <Select value={communityReport.category} onValueChange={(val) => handleCommunityChange('category', val)}>
                                    <SelectTrigger id="community-category"><SelectValue placeholder="Select a category..." /></SelectTrigger>
                                    <SelectContent>
                                        {communityReportCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="community-subject">Subject *</Label>
                                <Input id="community-subject" value={communityReport.subject} onChange={e => handleCommunityChange('subject', e.target.value)} placeholder="e.g., Inappropriate post on feed" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="community-description">Description *</Label>
                                <Textarea id="community-description" value={communityReport.description} onChange={e => handleCommunityChange('description', e.target.value)} placeholder="Please provide as much detail as possible..." className="min-h-16"/>
                            </div>
                             <div className="space-y-2">
                                <Label>Attach Image (Optional)</Label>
                                {communityReport.image ? (
                                    <div className="relative w-32 h-32">
                                        <Image src={communityReport.image} alt="Preview" fill style={{objectFit:"cover"}} className="rounded-md border" />
                                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => handleCommunityChange('image', null)}><X className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
                                        <Button type="button" variant="outline" onClick={() => { setActiveCameraFor('community'); setIsCameraOpen(true); }}><Camera className="mr-2 h-4 w-4" />Take Picture</Button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label>Identity & Contact Preference</Label>
                                <div className="p-4 border rounded-md space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="community-anonymous" checked={communityReport.anonymous} onCheckedChange={(checked) => handleCommunityChange('anonymous', checked as boolean)} />
                                        <Label htmlFor="community-anonymous" className="font-normal">Report Anonymously</Label>
                                    </div>
                                    {!communityReport.anonymous && (
                                        <RadioGroup value={communityReport.contactPreference} onValueChange={(val) => handleCommunityChange('contactPreference', val)} className="flex gap-4">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="chat" id="community-chat" /><Label htmlFor="community-chat" className="font-normal">Contact me via platform chat</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="email" id="community-email" /><Label htmlFor="community-email" className="font-normal">Contact me by email</Label></div>
                                        </RadioGroup>
                                    )}
                                    {communityReport.contactPreference === 'email' && !communityReport.anonymous && (
                                        <div className="pl-6"><Input type="email" value={communityReport.contactDetail} onChange={(e) => handleCommunityChange('contactDetail', e.target.value)} placeholder="Enter your email"/></div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => submitReport('community')} disabled={isCommunitySubmitting || !communityReport.subject || !communityReport.description || !communityReport.category}>
                                {isCommunitySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Send to Leader
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                 <TabsContent value="platform">
                     <Card className="shadow-[0_0_15px_rgba(239,68,68,0.2)] dark:shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <CardHeader>
                            <CardTitle>Platform-Level Issues</CardTitle>
                            <CardDescription>
                                For technical problems (bugs, errors), account issues, billing questions, or serious complaints about a community leader.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="platform-category">Category *</Label>
                                <Select value={platformReport.category} onValueChange={(val) => handlePlatformChange('category', val)}>
                                    <SelectTrigger id="platform-category"><SelectValue placeholder="Select a category..." /></SelectTrigger>
                                    <SelectContent>
                                        {platformReportCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="platform-severity">Severity *</Label>
                                <Select value={platformReport.severity || ''} onValueChange={(val) => handlePlatformChange('severity', val as ReportData['severity'])}>
                                    <SelectTrigger id="platform-severity"><SelectValue placeholder="Select a severity level..." /></SelectTrigger>
                                    <SelectContent>
                                        {severityLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="platform-subject">Subject *</Label>
                                <Input id="platform-subject" value={platformReport.subject} onChange={e => handlePlatformChange('subject', e.target.value)} placeholder="e.g., Cannot log into my account" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="platform-description">Description *</Label>
                                <Textarea id="platform-description" value={platformReport.description} onChange={e => handlePlatformChange('description', e.target.value)} placeholder="Please describe the issue in detail..." className="min-h-16"/>
                            </div>
                             <div className="space-y-2">
                                <Label>Attach Image (Optional)</Label>
                                {platformReport.image ? (
                                    <div className="relative w-32 h-32">
                                        <Image src={platformReport.image} alt="Preview" fill style={{objectFit:"cover"}} className="rounded-md border" />
                                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => handlePlatformChange('image', null)}><X className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
                                        <Button type="button" variant="outline" onClick={() => { setActiveCameraFor('platform'); setIsCameraOpen(true); }}><Camera className="mr-2 h-4 w-4" />Take Picture</Button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label>Identity & Contact Preference</Label>
                                <div className="p-4 border rounded-md space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="platform-anonymous" checked={platformReport.anonymous} onCheckedChange={(checked) => handlePlatformChange('anonymous', checked as boolean)} />
                                        <Label htmlFor="platform-anonymous" className="font-normal">Report Anonymously</Label>
                                    </div>
                                    {!platformReport.anonymous && (
                                        <RadioGroup value={platformReport.contactPreference} onValueChange={(val) => handlePlatformChange('contactPreference', val)} className="flex gap-4">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="chat" id="platform-chat" /><Label htmlFor="platform-chat" className="font-normal">Contact me via platform chat</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="email" id="platform-email" /><Label htmlFor="platform-email" className="font-normal">Contact me by email</Label></div>
                                        </RadioGroup>
                                    )}
                                    {platformReport.contactPreference === 'email' && !platformReport.anonymous && (
                                        <div className="pl-6"><Input type="email" value={platformReport.contactDetail} onChange={(e) => handlePlatformChange('contactDetail', e.target.value)} placeholder="Enter your email"/></div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => submitReport('platform')} disabled={isPlatformSubmitting || !platformReport.subject || !platformReport.description || !platformReport.category || !platformReport.severity}>
                                {isPlatformSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Send to Platform Admin
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogHeader>
              <DialogTitle>Take a Picture</DialogTitle>
            </DialogHeader>
            <div className="p-6">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                {hasCameraPermission === false && <Alert variant="destructive" className="mt-4"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
            </div>
            <DialogFooter className="p-6 pt-0">
                <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>
                    <Camera className="mr-2" /> Capture
                </Button>
                <Button variant="outline" onClick={() => {setIsCameraOpen(false); setActiveCameraFor(null);}}>Cancel</Button>
            </DialogFooter>
        </Dialog>
        <canvas ref={canvasRef} className="hidden" />
        <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, activeCameraFor || 'community')} accept="image/*" className="hidden" />
        </>
    );
}

export default function ReportIssuePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ReportIssueContent />
        </Suspense>
    );
}
