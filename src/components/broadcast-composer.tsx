
"use client";

import * as React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, Send, Siren, Loader2, AlertTriangle, Upload, Camera, Bell, X, Users, Globe } from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { DatePicker } from "./ui/date-picker";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./rich-text-editor";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { createPlatformAnnouncementAction } from "@/lib/actions/announcementActions";
import { MultiSelect } from "./ui/multi-select";
import { collection, onSnapshot, query } from "firebase/firestore";
import { CommunitySelector, type CommunitySelection } from "./community-selector";
import { Badge } from "./ui/badge";
import { useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';


type BroadcastType = 'standard' | 'emergency';
type Severity = 'normal' | 'urgent';

const userRoles = [
  { value: "all", label: "All Users" },
  { value: "leader", label: "Community Leaders" },
  { value: "business", label: "Business Accounts" },
  { value: "personal", label: "Personal Accounts" },
];

export function BroadcastComposer() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);

    const { data: userProfile } = useDoc(userProfileRef);

    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [selectedBroadcast, setSelectedBroadcast] = React.useState<BroadcastType>('standard');
    
    // Form State
    const [subject, setSubject] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [activateImmediately, setActivateImmediately] = React.useState(true);
    const [startDate, setStartDate] = React.useState<Date>();
    const [endDate, setEndDate] = React.useState<Date>();
    const [severity, setSeverity] = React.useState<Severity>('normal');
    const [image, setImage] = React.useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [showOnLoginPage, setShowOnLoginPage] = React.useState(false);
    
    const [audienceType, setAudienceType] = React.useState('all');
    const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = React.useState<CommunitySelection>({
        id: "1", country: null, state: null, region: null, community: null,
    });

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
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
            setImage(canvas.toDataURL('image/jpeg', 0.9));
            setIsCameraOpen(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };


    const isUrgentStandard = selectedBroadcast === 'standard' && severity === 'urgent';
    const showImageUpload = true;

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner';
    const isLeader = userProfile?.role === 'president' || userProfile?.role === 'leader';
    const canSendEmergency = isAdmin || isLeader;

    const resetForm = () => {
        setSubject("");
        setMessage("");
        setActivateImmediately(true);
        setStartDate(undefined);
        setEndDate(undefined);
        setSeverity('normal');
        setImage(null);
        setShowOnLoginPage(false);
        setAudienceType('all');
        setSelectedRoles([]);
        setSelectedLocation({id: "1", country: null, state: null, region: null, community: null});
    };
    
    const handleSubmit = async () => {
        if (!user || !userProfile) {
            toast({ title: "Error", description: "You must be logged in to send announcements.", variant: "destructive" });
            return;
        }
        if (!subject || !message) {
            toast({ title: "Error", description: "Subject and message are required.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const isImmediate = activateImmediately || isUrgentStandard || selectedBroadcast === 'emergency';
        let audience;
        let scope: 'platform' | 'community' = 'platform';
        let communityId;

        if (isAdmin) {
             if (audienceType === 'roles') {
                audience = selectedRoles;
            } else if (audienceType === 'location') {
                audience = selectedLocation;
            } else {
                audience = 'All Users';
            }
        } else {
            scope = 'community';
            communityId = userProfile.communityId;
            audience = 'All Users';
        }

        try {
            const result = await createPlatformAnnouncementAction({
                userId: user.uid,
                subject,
                message,
                image,
                type: selectedBroadcast === 'standard' ? 'Standard' : 'Emergency',
                severity: selectedBroadcast === 'standard' ? severity : undefined,
                status: isImmediate ? "Live" : "Scheduled",
                audience: audience,
                showOnLoginPage,
                scheduledDates: isImmediate
                    ? new Date().toLocaleDateString()
                    : (startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : "Not specified"),
                startDate: !isImmediate ? startDate : null,
                endDate: !isImmediate ? endDate : null,
                scope: scope,
                communityId: communityId,
                sentBy: userProfile.broadcastDisplayName || userProfile.name,
            });
            if (result.success) {
                toast({ title: "Success!", description: "Your announcement has been created." });
                resetForm();
            } else {
                throw new Error(result.error || "An unknown error occurred.");
            }
        } catch (error: any) {
            console.error("Error creating announcement:", error);
            toast({ title: "Error", description: error.message || "Failed to create announcement.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Broadcast Composer</CardTitle>
                </CardHeader>
                <CardContent className="h-48 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className={cn(
            "transition-all duration-500",
            selectedBroadcast === 'emergency' && "border-destructive bg-destructive/5",
            isUrgentStandard && "border-amber-500 bg-amber-50 dark:bg-amber-900/30",
        )}>
            <CardHeader>
                <CardTitle>{isAdmin ? "Platform" : "Community"} Broadcast Composer</CardTitle>
                 <div className="grid md:grid-cols-2 gap-6 pt-4">
                    <div
                        className={cn(
                            "p-6 rounded-lg border-2 cursor-pointer transition-all",
                            selectedBroadcast === 'standard' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedBroadcast('standard')}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Bell className="h-6 w-6 text-primary" />
                            <h3 className="text-lg font-semibold">Standard Announcement</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            For general updates, news, and engagement.
                        </p>
                    </div>
                    <div
                        className={cn(
                            "p-6 rounded-lg border-2 cursor-pointer transition-all",
                            selectedBroadcast === 'emergency' ? "border-destructive bg-destructive/5" : "border-border hover:border-destructive/50",
                            !canSendEmergency && "cursor-not-allowed opacity-50"
                        )}
                        onClick={() => canSendEmergency && setSelectedBroadcast('emergency')}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Siren className="h-6 w-6 text-destructive" />
                            <h3 className="text-lg font-semibold text-destructive">Emergency Broadcast</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            For urgent, critical information only. Sent to all users immediately.
                        </p>
                        <Badge variant="destructive" className="mt-2">High Priority</Badge>
                    </div>
                </div>
            </CardHeader>
             <CardContent className="space-y-6">
                 {selectedBroadcast === 'emergency' && (
                    <Alert variant="destructive">
                        <Siren className="h-4 w-4" />
                        <AlertTitle>Emergency Broadcast Warning</AlertTitle>
                        <AlertDescription>
                            This will send a non-dismissible, high-priority alert. Use with extreme caution.
                        </AlertDescription>
                    </Alert>
                )}
                
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder={selectedBroadcast === 'standard' ? 'e.g., Upcoming System Maintenance' : 'e.g., NATIONAL WEATHER ALERT'} value={subject} onChange={e => setSubject(e.target.value)} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <RichTextEditor
                        value={message}
                        onChange={setMessage}
                        placeholder="Compose your announcement..."
                    />
                </div>

                {showImageUpload && (
                    <div className="space-y-2">
                        <Label>Image (Optional)</Label>
                        {image ? (
                             <div className="relative w-48 h-36">
                                <Image src={image} alt="Preview" fill style={{objectFit:"cover"}} className="rounded-md" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={() => setImage(null)}><X className="h-4 w-4" /></Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2" /> Upload</Button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2" /> Take Picture</Button>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                )}
                 {isCameraOpen && (
                    <div className="space-y-2">
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                        {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
                        <div className="flex gap-2"><Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button><Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button></div>
                    </div>
                )}

                {isAdmin && <div className="space-y-4">
                    <Label>Audience</Label>
                    <RadioGroup defaultValue="all" value={audienceType} onValueChange={(value) => setAudienceType(value as string)} className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="audience-all" />
                            <Label htmlFor="audience-all" className="font-normal">All Users</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="roles" id="audience-roles" />
                            <Label htmlFor="audience-roles" className="font-normal">Specific Roles</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="location" id="audience-location" />
                            <Label htmlFor="audience-location" className="font-normal">Specific Location</Label>
                        </div>
                    </RadioGroup>
                    {audienceType === 'roles' && (
                        <div className="pl-6 pt-2">
                            <MultiSelect 
                                options={userRoles} 
                                selected={selectedRoles} 
                                onChange={setSelectedRoles} 
                                className="max-w-md"
                            />
                        </div>
                    )}
                    {audienceType === 'location' && (
                        <div className="pl-6 pt-2">
                            <CommunitySelector selection={selectedLocation} onSelectionChange={setSelectedLocation} />
                        </div>
                    )}
                </div>}

                {selectedBroadcast === 'standard' && (
                    <>
                        <div className="space-y-3">
                            <Label>Severity</Label>
                            <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as 'normal' | 'urgent')} className="flex gap-4">
                                 <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="normal" id="platform-normal" />
                                    <Label htmlFor="platform-normal" className="font-normal">Normal</Label>
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="urgent" id="platform-urgent" />
                                    <Label htmlFor="platform-urgent" className="font-normal">Urgent</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-4">
                            <Label>Activation</Label>
                            <div className="flex items-center space-x-2">
                                <Switch id="activation-mode" checked={activateImmediately} onCheckedChange={setActivateImmediately} />
                                <Label htmlFor="activation-mode">{activateImmediately ? "Activate Immediately" : "Activate by Date"}</Label>
                            </div>
                            {!activateImmediately && (
                                <div className="grid sm:grid-cols-2 gap-4 pl-8 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="start-date" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Start Date</Label>
                                        <DatePicker date={startDate} setDate={setStartDate} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end-date" className="flex items-center gap-2"><Clock className="h-4 w-4" /> End Date</Label>
                                        <DatePicker date={endDate} setDate={setEndDate} />
                                    </div>
                                </div>
                            )}
                        </div>
                         {isAdmin && <div className="space-y-4">
                            <Label>Placement</Label>
                            <div className="flex items-center space-x-2">
                                <Switch id="show-on-login" checked={showOnLoginPage} onCheckedChange={setShowOnLoginPage} />
                                <Label htmlFor="show-on-login">Show on Login Page</Label>
                            </div>
                            <p className="text-xs text-muted-foreground pl-8">If enabled, this announcement will be visible to all visitors on the main login page.</p>
                        </div>}
                    </>
                )}
            </CardContent>
            <CardFooter>
                 <Button 
                    variant={selectedBroadcast === 'emergency' ? 'destructive' : 'default'} 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {selectedBroadcast === 'emergency' ? 'Dispatch Emergency Broadcast' : 'Schedule Broadcast'}
                </Button>
            </CardFooter>
        </Card>
    );
}
