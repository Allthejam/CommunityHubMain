
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
import { Calendar, Clock, Send, Siren, Loader2, AlertTriangle, Upload, Camera, Bell, X, Users, Globe, Pencil } from "lucide-react";
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
import { createPlatformAnnouncementAction } from "@/lib/actions/announcementActions";
import { Badge } from "./ui/badge";
import { doc, getDoc, collection, query, getDocs, where, documentId } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "./ui/dialog";
import { BroadcastAudienceSelector, type RefinedScope } from "./audience-selector";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";

type BroadcastType = 'standard' | 'emergency';
type Severity = 'normal' | 'urgent';

const AudienceSummary = ({ selection }: { selection: RefinedScope | undefined }) => {
    const db = useFirestore();
    const [summary, setSummary] = React.useState("Click 'Refine' to target specific areas.");
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const generateSummary = async () => {
            if (!db || !selection) {
                setSummary("Click 'Refine' to target specific areas.");
                return;
            }

            setLoading(true);

            let ids: string[] = [];
            let collectionName = '';
            let label = '';
            let isTopLevel = false;

            if (selection.communities.length > 0) {
                ids = selection.communities;
                collectionName = 'communities';
            } else if (selection.regions.length > 0) {
                ids = selection.regions;
                collectionName = 'locations';
            } else if (selection.states.length > 0) {
                ids = selection.states;
                collectionName = 'locations';
            } else {
                isTopLevel = true;
            }

            if (isTopLevel) {
                try {
                    const countryDoc = await getDoc(doc(db, 'locations', selection.country));
                    if (countryDoc.exists()) {
                        setSummary(`Targeting entire scope: ${countryDoc.data().name}`);
                    } else {
                        setSummary("Targeting entire scope.");
                    }
                } catch (e) {
                     setSummary("Error loading scope name.");
                }
            } else if (ids.length > 0) {
                 try {
                    const q = query(collection(db, collectionName), where(documentId(), 'in', ids.slice(0, 10)));
                    const snapshot = await getDocs(q);
                    const names = snapshot.docs.map(doc => doc.data().name);

                    if (names.length === 0) {
                        setSummary("No specific targets selected.");
                    } else if (names.length > 2) {
                        setSummary(`Targeting: ${names.slice(0, 2).join(', ')}... and ${names.length - 2} more.`);
                    } else {
                        setSummary(`Targeting: ${names.join(', ')}`);
                    }
                } catch (e) {
                    console.error("Error generating summary:", e);
                    setSummary("Error loading details.");
                }
            } else {
                setSummary("Targeting entire scope.");
            }

            setLoading(false);
        };

        generateSummary();
    }, [selection, db]);

    if (loading) {
        return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading details...</span>;
    }

    return <p className="text-xs text-muted-foreground mt-1">{summary}</p>;
}


export function BroadcastComposer() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);

    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
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
    const [userChoice, setUserChoice] = React.useState<BroadcastType | null>(null);
    
    const [selectedAudience, setSelectedAudience] = React.useState<RefinedScope[]>([]);
    const [scopeToRefine, setScopeToRefine] = React.useState<any | null>(null);
    const [isAudienceDialogOpen, setIsAudienceDialogOpen] = React.useState(false);
    const [resolvedScopes, setResolvedScopes] = React.useState<any[]>([]);
    const [loadingScopes, setLoadingScopes] = React.useState(true);
    
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const { canSendStandard, canSendEmergency, approvedScopes } = React.useMemo(() => {
        if (!userProfile) return { canSendStandard: false, canSendEmergency: false, approvedScopes: [] };
        
        const permissions = userProfile.permissions || {};
        const isAdmin = userProfile.role === 'admin' || userProfile.role === 'owner';
        const hasLegacyAccess = userProfile.settings?.hasBroadcastAccess === true;
        
        const standard = isAdmin || permissions.canSendStandardBroadcast || hasLegacyAccess;
        const emergency = isAdmin || permissions.canSendEmergencyBroadcast || hasLegacyAccess;
        
        const scopes = userProfile.broadcastScopes || userProfile.permissions?.broadcastScopes || [];
        
        return {
            canSendStandard: standard,
            canSendEmergency: emergency,
            approvedScopes: Array.isArray(scopes) ? scopes : [],
        };
    }, [userProfile]);

    React.useEffect(() => {
        if (!approvedScopes || approvedScopes.length === 0 || !db) {
            setLoadingScopes(false);
            setResolvedScopes([]);
            return;
        }
    
        const fetchNames = async () => {
            setLoadingScopes(true);
            const resolved = await Promise.all(
                approvedScopes.map(async (scope: any) => {
                    let name = 'Unknown Scope';
                    let docId = '';
                    let collectionName = 'locations'; 
                    
                    switch (scope.targetLevel) {
                        case 'country': docId = scope.country; break;
                        case 'state': docId = scope.state; break;
                        case 'region': docId = scope.region; break;
                        case 'community': docId = scope.community; collectionName = 'communities'; break;
                        default: name = scope.path || 'Full Platform'; docId = '';
                    }
                    
                    if (docId) {
                        try {
                            const docSnap = await getDoc(doc(db, collectionName, docId));
                            if (docSnap.exists()) name = docSnap.data().name;
                            else name = `Unknown ${scope.targetLevel}`;
                        } catch (e) {
                            console.error(`Error fetching name for scope:`, e);
                            name = `Error loading ${scope.targetLevel}`;
                        }
                    }
                    
                    return { ...scope, name };
                })
            );
            setResolvedScopes(resolved);
            setLoadingScopes(false);
        };
    
        fetchNames();
    }, [approvedScopes, db]);
    

    const selectedBroadcast = React.useMemo<BroadcastType>(() => {
        if (userChoice === 'standard' && canSendStandard) return 'standard';
        if (userChoice === 'emergency' && canSendEmergency) return 'emergency';
        if (canSendStandard) return 'standard';
        if (canSendEmergency) return 'emergency';
        return 'standard';
    }, [userChoice, canSendStandard, canSendEmergency]);

    React.useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
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

    const resetForm = () => {
        setSubject("");
        setMessage("");
        setActivateImmediately(true);
        setStartDate(undefined);
        setEndDate(undefined);
        setSeverity('normal');
        setImage(null);
        setSelectedAudience([]);
    };
    
    const handleOpenRefineDialog = (scope: any) => {
        setScopeToRefine(scope);
        // Ensure the selection object exists for this scope
        if (!selectedAudience.some(s => s.id === scope.id)) {
            setSelectedAudience(prev => [...prev, {
                id: scope.id,
                country: scope.country,
                states: [],
                regions: [],
                communities: []
            }]);
        }
        setIsAudienceDialogOpen(true);
    };

    const handleRefinedSelectionChange = (newSelection: RefinedScope) => {
        setSelectedAudience(prev => 
            prev.map(s => s.id === newSelection.id ? newSelection : s)
        );
    };

    const currentSelectionForDialog = React.useMemo(() => 
        selectedAudience.find(s => s.id === scopeToRefine?.id)
    , [selectedAudience, scopeToRefine]);
    
     const handleScopeSelectionToggle = (scope: any) => {
        setSelectedAudience(prev => {
            const isSelected = prev.some(s => s.id === scope.id);
            if (isSelected) {
                return prev.filter(s => s.id !== scope.id);
            } else {
                return [...prev, {
                    id: scope.id,
                    country: scope.country,
                    states: [],
                    regions: [],
                    communities: []
                }];
            }
        });
    };

    const handleSubmit = async () => {
        if (!user || !userProfile) {
            toast({ title: "Error", description: "Cannot send announcement. Missing user data.", variant: "destructive" });
            return;
        }
        if (!subject || !message) {
            toast({ title: "Error", description: "Subject and message are required.", variant: "destructive" });
            return;
        }
        if (selectedAudience.length === 0) {
            toast({ title: "Error", description: "Please select at least one target audience scope.", variant: "destructive" });
            return;
        }
        const isImmediate = activateImmediately || isUrgentStandard || selectedBroadcast === 'emergency';
        if (!isImmediate && (startDate && !endDate)) {
            toast({ title: "Error", description: "An end date is required when a start date is set.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const result = await createPlatformAnnouncementAction({
                userId: user.uid,
                subject,
                message,
                image,
                type: selectedBroadcast === 'standard' ? 'Standard' : 'Emergency',
                severity: selectedBroadcast === 'standard' ? severity : undefined,
                status: isImmediate ? "Live" : "Scheduled",
                audience: selectedAudience,
                showOnLoginPage: false,
                scheduledDates: isImmediate
                    ? new Date().toLocaleDateString()
                    : (startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : "Not specified"),
                startDate: !isImmediate ? startDate : null,
                endDate: !isImmediate ? endDate : null,
                scope: 'platform',
                sentBy: userProfile.broadcastDisplayName || userProfile.name,
                ownerId: user.uid,
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
    
    if (authLoading || profileLoading) {
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
        <>
        <Card className={cn(
            "transition-all duration-500",
            selectedBroadcast === 'emergency' && "border-destructive bg-destructive/5",
            isUrgentStandard && "border-amber-500 bg-amber-50 dark:bg-amber-900/30",
        )}>
            <CardHeader>
                <CardTitle>Broadcast Composer</CardTitle>
                 <div className="grid md:grid-cols-2 gap-6 pt-4">
                    <div
                        className={cn(
                            "p-6 rounded-lg border-2 cursor-pointer transition-all",
                            selectedBroadcast === 'standard' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                            !canSendStandard && "cursor-not-allowed opacity-50"
                        )}
                        onClick={() => canSendStandard && setUserChoice('standard')}
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
                        onClick={() => canSendEmergency && setUserChoice('emergency')}
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
                            This will send a non-dismissible, high-priority alert and an email to all members within your selected scopes. Use with extreme caution.
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
                
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-base">Target Audience</CardTitle>
                        <CardDescription>Select from your approved broadcast scopes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingScopes ? (
                            <div className="flex items-center justify-center h-10">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : resolvedScopes.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {resolvedScopes.map((scope: any) => {
                                    const isSelected = selectedAudience.some(s => s.id === scope.id);
                                    const selection = selectedAudience.find(s => s.id === scope.id);
                                    return (
                                    <div key={scope.id} className="p-3 border rounded-lg bg-background">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                 <Checkbox
                                                    id={`scope-${scope.id}`}
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleScopeSelectionToggle(scope)}
                                                />
                                                <Label htmlFor={`scope-${scope.id}`} className="font-semibold flex items-center gap-2">
                                                    {scope.name}
                                                    <Badge variant="secondary" className="capitalize">{scope.targetLevel}</Badge>
                                                </Label>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => handleOpenRefineDialog(scope)} disabled={!isSelected}>
                                                <Pencil className="mr-2 h-4 w-4" /> Refine Selection
                                            </Button>
                                        </div>
                                        {isSelected && <AudienceSummary selection={selection} />}
                                    </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">You do not have any pre-approved broadcast scopes. Please apply for special access.</p>
                        )}
                    </CardContent>
                </Card>


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
                    </>
                )}
            </CardContent>
            <CardFooter>
                 <Button 
                    variant={selectedBroadcast === 'emergency' ? 'destructive' : 'default'} 
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedAudience.length === 0 || (!activateImmediately && startDate && !endDate)}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {selectedBroadcast === 'emergency' ? 'Dispatch Emergency Broadcast' : 'Schedule Broadcast'}
                </Button>
            </CardFooter>
        </Card>
        
        <Dialog open={isAudienceDialogOpen} onOpenChange={setIsAudienceDialogOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Refine Audience: {scopeToRefine?.name}</DialogTitle>
                    <DialogDescription>
                        Select specific areas within this scope to target. If nothing is selected, the entire scope will be targeted.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {scopeToRefine && currentSelectionForDialog ? (
                         <ScrollArea className="h-72">
                            <BroadcastAudienceSelector 
                                initialScope={scopeToRefine}
                                selection={currentSelectionForDialog}
                                onSelectionChange={handleRefinedSelectionChange}
                            />
                        </ScrollArea>
                    ) : (
                        <div className="flex items-center justify-center h-48">
                            <p className="text-muted-foreground">Could not load audience selector.</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
