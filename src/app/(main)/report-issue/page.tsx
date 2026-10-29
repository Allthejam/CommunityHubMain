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
import { uploadImageAction } from '@/lib/actions/storageActions';
import { Loader2, ShieldQuestion, Users, Upload, Camera, X, RefreshCw, Plus, Clock, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useSearchParams } from 'next/navigation';
import { getDropdownOptions } from '@/lib/actions/dropdownActions';

type ReportData = {
    subject: string;
    category: string;
    description: string;
    image: string | null;
    images: string[];
    anonymous: boolean;
    contactPreference: string;
    contactDetail: string;
    severity?: 'Low' | 'Moderate' | 'Severe';
};

const initialReportState: ReportData = {
    subject: '',
    category: '',
    description: '',
    image: null,
    images: [],
    anonymous: false,
    contactPreference: 'chat',
    contactDetail: '',
    severity: undefined,
};

const severityLevels: Array<NonNullable<ReportData['severity']>> = ["Low", "Moderate", "Severe"];

function ReportIssueContent() {
    const [mounted, setMounted] = useState(false);
    const { user } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    const { toast } = useToast();
    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    const [communityReport, setCommunityReport] = useState<ReportData>(initialReportState);
    const [platformReport, setPlatformReport] = useState<ReportData>(initialReportState);
    const [isCommunitySubmitting, startCommunityTransition] = useTransition();
    const [isPlatformSubmitting, startPlatformTransition] = useTransition();

    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [activeCameraFor, setActiveCameraFor] = useState<'community' | 'platform' | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState('community');

    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    
    const [platformReportCategories, setPlatformReportCategories] = useState<any[]>([]);
    const [communityReportCategories, setCommunityReportCategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        async function fetchOptions() {
            setLoadingCategories(true);
            const options = await getDropdownOptions();
            setPlatformReportCategories(options.ReportPlatAdmin || []);
            setCommunityReportCategories(options.ReportComLeader || []);
            setLoadingCategories(false);
        }
        fetchOptions();
    }, []);
    
    useEffect(() => {
        const postId = searchParams.get('postId');
        const subjectParam = searchParams.get('subject');
        const categoryParam = searchParams.get('category');
        const tabParam = searchParams.get('tab');
        
        let subjectText = '';
        if (postId) {
            subjectText = `Regarding post: ${postId}`;
        } else if (subjectParam) {
            subjectText = subjectParam;
        }

        if (tabParam === 'platform') {
            setActiveTab('platform');
            setPlatformReport(prev => ({ 
                ...prev, 
                subject: subjectText,
                category: categoryParam || (subjectParam === 'Request a Private Hub' ? 'Request a Private Hub' : prev.category)
            }));
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
        const getCameraStream = async () => {
            if (isCameraOpen) {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                const constraints: MediaStreamConstraints = {
                    video: { facingMode: { exact: facingMode } }
                };

                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    streamRef.current = stream;
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoInputs = devices.filter(device => device.kind === 'videoinput');
                    setVideoDevices(videoInputs);
                } catch (error) {
                    console.error("Error accessing camera:", error);
                    // Fallback for browsers that don't support 'exact'
                    if ((error as any).name === 'OverconstrainedError' || (error as any).name === 'ConstraintNotSatisfiedError') {
                        try {
                             const fallbackConstraints: MediaStreamConstraints = { video: true };
                             const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                             streamRef.current = stream;
                             setHasCameraPermission(true);
                             if (videoRef.current) videoRef.current.srcObject = stream;
                             const devices = await navigator.mediaDevices.enumerateDevices();
                             const videoInputs = devices.filter(device => device.kind === 'videoinput');
                             setVideoDevices(videoInputs);
                        } catch (fallbackError) {
                            setHasCameraPermission(false);
                            setIsCameraOpen(false);
                            toast({ variant: "destructive", title: "Camera Access Denied", description: "Could not access camera. Please check permissions." });
                        }
                    } else {
                        setHasCameraPermission(false);
                        setIsCameraOpen(false);
                        toast({ variant: "destructive", title: "Camera Access Denied", description: "Please enable camera permissions in your browser settings." });
                    }
                }
            } else {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            }
        };

        getCameraStream();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen, facingMode, toast]);

    const handleSwitchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const addImageToReport = async (dataUrl: string, reportType: 'community' | 'platform', fileName?: string) => {
        setIsUploadingImage(true);
        let finalUrl = dataUrl;
        try {
            const commId = reportType === 'community' ? (userProfile?.communityId || 'general') : 'platform';
            const cleanName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, '') : `photo_${Date.now()}.jpg`;
            const storagePath = `reports/${commId}/temp_${Date.now()}_${cleanName}`;
            const res = await uploadImageAction({ base64Data: dataUrl, path: storagePath });
            if (res.success && res.url) {
                finalUrl = res.url;
            }
        } catch (err) {
            console.error("Storage upload error:", err);
        } finally {
            setIsUploadingImage(false);
        }

        const updater = reportType === 'community' ? setCommunityReport : setPlatformReport;
        updater(prev => {
            const currentList = Array.isArray(prev.images) ? [...prev.images] : (prev.image ? [prev.image] : []);
            if (currentList.length >= 2) {
                toast({ title: 'Image Limit Reached', description: 'Maximum of 2 images allowed per report.', variant: 'destructive' });
                return prev;
            }
            const updated = [...currentList, finalUrl].slice(0, 2);
            return {
                ...prev,
                images: updated,
                image: updated[0] || null,
            };
        });
    };

    const removeImageFromReport = (index: number, reportType: 'community' | 'platform') => {
        const updater = reportType === 'community' ? setCommunityReport : setPlatformReport;
        updater(prev => {
            const currentList = Array.isArray(prev.images) ? [...prev.images] : (prev.image ? [prev.image] : []);
            const updated = currentList.filter((_, i) => i !== index);
            return {
                ...prev,
                images: updated,
                image: updated[0] || null,
            };
        });
    };

    const handleCapture = async () => {
        if (videoRef.current && canvasRef.current && activeCameraFor) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            const target = activeCameraFor;
            setIsCameraOpen(false);
            setActiveCameraFor(null);

            await addImageToReport(dataUrl, target, `cam_${Date.now()}.jpg`);
        }
    };

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB friendly limit

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, reportType: 'community' | 'platform') => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast({
                    title: 'Image Too Large',
                    description: `The selected photo (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed size of 10MB. Please choose a smaller photo.`,
                    variant: 'destructive',
                });
                event.target.value = '';
                return;
            }

            const currentCount = reportType === 'community' 
                ? (communityReport.images?.length || (communityReport.image ? 1 : 0))
                : (platformReport.images?.length || (platformReport.image ? 1 : 0));
            if (currentCount >= 2) {
                toast({ title: 'Limit Reached', description: 'You can upload a maximum of 2 images.', variant: 'destructive' });
                event.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                addImageToReport(reader.result as string, reportType, file.name);
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }
    };

    const submitReport = (reportType: 'community' | 'platform') => {
        if (!user || !userProfile) return;
        const reportData = reportType === 'community' ? communityReport : platformReport;
        
        if (!reportData.category || !reportData.subject || !reportData.description || !reportData.severity) {
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
                image: reportData.images?.[0] || reportData.image || null,
                images: reportData.images?.length > 0 ? reportData.images : (reportData.image ? [reportData.image] : []),
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
    
    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

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

                {/* Report Retention & Deletion Policy Disclosure */}
                <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-sm">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                        <span className="font-bold text-sm block">Data Protection & Automated Record Retention Notice</span>
                        <p className="leading-relaxed text-blue-800 dark:text-blue-300">
                            To protect resident privacy under GDPR and preserve platform storage hygiene, reports and attached photos are retained for a <strong>maximum of 6 months if unopened</strong>, or <strong>3 months once reviewed/resolved</strong>, after which they are permanently deleted from our servers. Authorised leaders or police liaison officers may download offline PDF records prior to deletion.
                        </p>
                    </div>
                </div>
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
                                <Select value={communityReport.category} onValueChange={(val) => handleCommunityChange('category', val)} disabled={loadingCategories}>
                                    <SelectTrigger id="community-category"><SelectValue placeholder={loadingCategories ? "Loading..." : "Select a category..."} /></SelectTrigger>
                                    <SelectContent>
                                        {communityReportCategories.map((cat, index) => {
                                            const key = typeof cat === 'object' ? cat.id || cat.name || index : cat;
                                            const value = typeof cat === 'object' ? cat.name || cat : cat;
                                            return (
                                                <SelectItem key={key} value={value}>
                                                    {value}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="community-severity">Severity *</Label>
                                <Select value={communityReport.severity || ''} onValueChange={(val) => handleCommunityChange('severity', val as ReportData['severity'])}>
                                    <SelectTrigger id="community-severity"><SelectValue placeholder="Select a severity level..." /></SelectTrigger>
                                    <SelectContent>
                                        {severityLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
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
                                <div className="flex items-center justify-between">
                                    <Label>Attach Images (Optional - Max 2)</Label>
                                    <span className="text-xs text-muted-foreground">
                                        {(communityReport.images?.length || (communityReport.image ? 1 : 0))} / 2 images
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-3 items-center">
                                    {(communityReport.images && communityReport.images.length > 0 
                                        ? communityReport.images 
                                        : (communityReport.image ? [communityReport.image] : [])
                                    ).map((imgUrl, idx) => (
                                        <div key={idx} className="relative w-28 h-28 rounded-md overflow-hidden border bg-muted shadow-sm group">
                                            <Image src={imgUrl} alt={`Attached issue photo ${idx + 1}`} fill style={{objectFit:"cover"}} />
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="icon" 
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-md opacity-90 hover:opacity-100" 
                                                onClick={() => removeImageFromReport(idx, 'community')}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                #{idx + 1}
                                            </span>
                                        </div>
                                    ))}

                                    {(communityReport.images?.length || (communityReport.image ? 1 : 0)) < 2 && (
                                        <div className="flex gap-2">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isUploadingImage}
                                                onClick={() => {
                                                    setActiveCameraFor('community');
                                                    fileInputRef.current?.click();
                                                }}
                                            >
                                                {isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                Upload Photo
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isUploadingImage}
                                                onClick={() => { 
                                                    setActiveCameraFor('community'); 
                                                    setIsCameraOpen(true); 
                                                }}
                                            >
                                                <Camera className="mr-2 h-4 w-4" />Take Picture
                                            </Button>
                                        </div>
                                    )}
                                </div>
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
                            <Button onClick={() => submitReport('community')} disabled={isCommunitySubmitting || !communityReport.subject || !communityReport.description || !communityReport.category || !communityReport.severity}>
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
                                <Select value={platformReport.category} onValueChange={(val) => handlePlatformChange('category', val)} disabled={loadingCategories}>
                                    <SelectTrigger id="platform-category"><SelectValue placeholder={loadingCategories ? "Loading..." : "Select a category..."} /></SelectTrigger>
                                    <SelectContent>
                                        {platformReportCategories.map((cat, index) => {
                                            const key = typeof cat === 'object' ? cat.id || cat.name || index : cat;
                                            const value = typeof cat === 'object' ? cat.name || cat : cat;
                                            return (
                                                <SelectItem key={key} value={value}>
                                                    {value}
                                                </SelectItem>
                                            );
                                        })}
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
                                <div className="flex items-center justify-between">
                                    <Label>Attach Images (Optional - Max 2)</Label>
                                    <span className="text-xs text-muted-foreground">
                                        {(platformReport.images?.length || (platformReport.image ? 1 : 0))} / 2 images
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-3 items-center">
                                    {(platformReport.images && platformReport.images.length > 0 
                                        ? platformReport.images 
                                        : (platformReport.image ? [platformReport.image] : [])
                                    ).map((imgUrl, idx) => (
                                        <div key={idx} className="relative w-28 h-28 rounded-md overflow-hidden border bg-muted shadow-sm group">
                                            <Image src={imgUrl} alt={`Attached issue photo ${idx + 1}`} fill style={{objectFit:"cover"}} />
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="icon" 
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-md opacity-90 hover:opacity-100" 
                                                onClick={() => removeImageFromReport(idx, 'platform')}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                #{idx + 1}
                                            </span>
                                        </div>
                                    ))}

                                    {(platformReport.images?.length || (platformReport.image ? 1 : 0)) < 2 && (
                                        <div className="flex gap-2">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isUploadingImage}
                                                onClick={() => {
                                                    setActiveCameraFor('platform');
                                                    fileInputRef.current?.click();
                                                }}
                                            >
                                                {isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                Upload Photo
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isUploadingImage}
                                                onClick={() => { 
                                                    setActiveCameraFor('platform'); 
                                                    setIsCameraOpen(true); 
                                                }}
                                            >
                                                <Camera className="mr-2 h-4 w-4" />Take Picture
                                            </Button>
                                        </div>
                                    )}
                                </div>
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
                 {videoDevices.length > 1 && (
                    <Button variant="outline" onClick={handleSwitchCamera}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Switch Camera
                    </Button>
                )}
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
