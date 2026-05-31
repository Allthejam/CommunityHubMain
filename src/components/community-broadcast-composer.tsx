
'use client';

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
import { Calendar, Clock, Send, Siren, Loader2, AlertTriangle, Upload, Camera, Bell, X, RefreshCw, Users } from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { DatePicker } from "./ui/date-picker";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./rich-text-editor";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { createCommunityAnnouncementAction } from "@/lib/actions/announcementActions";
import { doc } from 'firebase/firestore';
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

type BroadcastType = 'standard' | 'emergency';
type Severity = 'normal' | 'urgent';

export function CommunityBroadcastComposer() {
    const { user } = useUser();
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
    const [sendEmail, setSendEmail] = React.useState(false);

    // Camera state
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('environment');
    const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
    
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    
    const communityId = userProfile?.communityId;
    const communityRoleData = communityId && userProfile?.communityRoles ? userProfile.communityRoles[communityId] : null;

    const activeRole = communityRoleData?.role || userProfile?.role;
    const permissions = { ...(userProfile?.permissions || {}), ...(communityRoleData?.permissions || {}) };

    const canSendEmergency = activeRole === 'president' || permissions.canSendEmergencyBroadcast;
    
    const showImageUpload = true;

     React.useEffect(() => {
        const getCameraStream = async () => {
            if (isCameraOpen) {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                const constraints: MediaStreamConstraints = {
                    video: { facingMode }
                };

                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    streamRef.current = stream;
                    setHasCameraPermission(true);

                    const devices = await navigator.mediaDevices.enumerateDevices();
                    setVideoDevices(devices.filter(d => d.kind === 'videoinput'));

                } catch (error) {
                    console.error("Error accessing camera:", error);
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({
                        variant: "destructive",
                        title: "Camera Access Error",
                        description: "Could not access the specified camera. Please check permissions."
                    });
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
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    };

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
    
    const resetForm = () => {
        setSubject("");
        setMessage("");
        setActivateImmediately(true);
        setStartDate(undefined);
        setEndDate(undefined);
        setSeverity('normal');
        setImage(null);
        setSendEmail(false);
    };
    
    const handleSubmit = async () => {
        if (!user || !userProfile?.communityId) {
            toast({ title: "Error", description: "You must be logged in and assigned to a community.", variant: "destructive" });
            return;
        }
        if (!subject || !message) {
            toast({ title: "Error", description: "Subject and message are required.", variant: "destructive" });
            return;
        }

        const isImmediate = activateImmediately || severity === 'urgent' || selectedBroadcast === 'emergency';
        if (!isImmediate && (startDate && !endDate)) {
            toast({ title: "Error", description: "An end date is required when a start date is set.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const result = await createCommunityAnnouncementAction({
                userId: user.uid,
                communityId: userProfile.communityId,
                subject,
                message,
                image,
                type: selectedBroadcast === 'standard' ? 'Standard' : 'Emergency',
                severity: selectedBroadcast === 'standard' ? severity : undefined,
                status: isImmediate ? "Live" : "Scheduled",
                scheduledDates: isImmediate
                    ? new Date().toLocaleDateString()
                    : (startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : "Not specified"),
                startDate: !isImmediate ? startDate : null,
                endDate: !isImmediate ? endDate : null,
                sentBy: userProfile.broadcastDisplayName || userProfile.name || "Community Leader",
                sendEmail: sendEmail,
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
    
    return (
        <>
        <Card className={cn(
            "transition-all duration-500",
            selectedBroadcast === 'emergency' && "border-destructive bg-destructive/5",
            severity === 'urgent' && selectedBroadcast === 'standard' && "border-amber-500 bg-amber-50 dark:bg-amber-900/30",
        )}>
            <CardHeader>
                <CardTitle>Community Broadcast</CardTitle>
                <CardDescription>Create an announcement for your community members.</CardDescription>
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
                            For urgent, critical information only. Overrides user settings.
                        </p>
                    </div>
                </div>
            </CardHeader>
             <CardContent className="space-y-6">
                <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>New Announcement Rules</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 text-xs">
                            <li>Announcements set to 'Activate Immediately' without a date range will expire and be archived after 14 days.</li>
                            <li>If you set a Start Date for a scheduled announcement, you must also provide an End Date.</li>
                            <li>All announcements are subject to review by platform administrators.</li>
                        </ul>
                    </AlertDescription>
                </Alert>
                {selectedBroadcast === 'emergency' && (
                    <Alert variant="destructive">
                        <Siren className="h-4 w-4" />
                        <AlertTitle>Emergency Broadcast Warning</AlertTitle>
                        <AlertDescription>
                            This will send a non-dismissible, high-priority alert and an email to all members of your community. Use with extreme caution.
                        </AlertDescription>
                    </Alert>
                )}
                
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder={selectedBroadcast === 'standard' ? 'e.g., Weekly Farmers Market Reminder' : 'e.g., URGENT: Road Closure Due to Flooding'} value={subject} onChange={e => setSubject(e.target.value)} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <RichTextEditor
                        value={message}
                        onChange={setMessage}
                        placeholder="Compose your announcement for the community..."
                    />
                </div>
                
                 {showImageUpload && (
                    <div className="space-y-2">
                        <Label>Image (Optional)</Label>
                        {image ? (
                            <div className="relative w-48 h-32">
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
                
                <div className="space-y-2">
                    <Label>Audience</Label>
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            This announcement will be sent to the community of <span className="font-semibold text-foreground">{userProfile?.communityName || 'your community'}</span>.
                        </p>
                    </div>
                </div>
                
                {selectedBroadcast === 'standard' && (
                    <>
                        <div className="space-y-3">
                            <Label>Severity</Label>
                            <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as 'normal' | 'urgent')} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="normal" id="community-normal" />
                                    <Label htmlFor="community-normal" className="font-normal">Normal</Label>
                                </div>
                                    <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="urgent" id="community-urgent" />
                                    <Label htmlFor="community-urgent" className="font-normal">Urgent</Label>
                                </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground pl-1">Urgent announcements are highlighted but do not override user notification settings.</p>
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
                                        <Label htmlFor="end-date" className="flex items-center gap-2"><Clock className="h-4 w-4" /> End Date *</Label>
                                        <DatePicker date={endDate} setDate={setEndDate} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="send-email-checkbox" checked={sendEmail} onCheckedChange={(checked) => setSendEmail(checked as boolean)} />
                                <Label htmlFor="send-email-checkbox" className="font-normal">Also send as an email to all community members</Label>
                            </div>
                            {sendEmail && (
                                <Alert className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200 [&>svg]:text-amber-500 dark:[&>svg]:text-amber-300">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Responsible Use of Email Broadcasts</AlertTitle>
                                    <AlertDescription>
                                        Please use this feature for urgent or important announcements only. Misuse of the email broadcast system (e.g., for spam or non-essential updates) may result in this feature being disabled for your account.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </>
                )}
            </CardContent>
            <CardFooter>
                 <Button 
                    variant={selectedBroadcast === 'emergency' ? 'destructive' : 'default'} 
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!activateImmediately && startDate && !endDate)}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {selectedBroadcast === 'emergency' ? 'Dispatch Emergency Broadcast' : 'Schedule Broadcast'}
                </Button>
            </CardFooter>
        </Card>
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
                <div className="flex gap-2">
                    <Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button>
                    {videoDevices.length > 1 && (
                        <Button variant="outline" onClick={handleSwitchCamera}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Switch Camera
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}

    