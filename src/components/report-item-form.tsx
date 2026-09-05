'use client';

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2, Upload, Camera, X, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { DatePicker } from "./ui/date-picker";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';
import { reportLostOrFoundItemAction } from "@/lib/actions/lostAndFoundActions";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";


export function ReportItemForm() {
    const [open, setOpen] = useState(false);
    const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [image, setImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
     const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    useEffect(() => {
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
        setItemType('lost');
        setDescription('');
        setLocation('');
        setDate(new Date());
        setImage(null);
    }

    const handleSubmit = async () => {
        const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
        const effectiveCommunityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : (userProfile?.communityId || (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || 'N3SarfGXPLxBI7XcsinX');
        const effectiveOwnerId = user?.uid || (isDemo ? 'demo-personal' : '');
        const effectiveReporterName = userProfile?.name || (isDemo ? 'Demo Resident' : 'Community Member');

        if (!effectiveCommunityId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not determine your community.'});
            return;
        }
        if (!description || !location || !date) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.'});
            return;
        }

        setIsSubmitting(true);
        const newItem = {
            id: `lf-${Date.now()}`,
            type: itemType,
            description,
            location,
            date: date.toISOString(),
            image,
            ownerId: effectiveOwnerId,
            communityId: effectiveCommunityId,
            reporterName: effectiveReporterName,
            status: 'active',
        };

        if (isDemo && typeof window !== 'undefined') {
            try {
                const existing = JSON.parse(sessionStorage.getItem(`demo_lost_found_${effectiveCommunityId}`) || localStorage.getItem(`demo_lost_found_${effectiveCommunityId}`) || '[]');
                existing.unshift(newItem);
                sessionStorage.setItem(`demo_lost_found_${effectiveCommunityId}`, JSON.stringify(existing));
                localStorage.setItem(`demo_lost_found_${effectiveCommunityId}`, JSON.stringify(existing));
                window.dispatchEvent(new CustomEvent('demo_lost_found_updated', { detail: existing }));
            } catch (e) {}
        }

        const result = await reportLostOrFoundItemAction({
            type: itemType,
            description,
            location,
            date,
            image,
            ownerId: effectiveOwnerId,
            communityId: effectiveCommunityId,
            reporterName: effectiveReporterName,
        });

        if (result.success || isDemo) {
            toast({ title: isDemo ? 'Item Reported!' : 'Report Submitted', description: isDemo ? 'Your report is now live in the demo.' : 'Your report has been sent for review.' });
            setOpen(false);
            resetForm();
        } else {
            toast({ variant: 'destructive', title: 'Submission Failed', description: result.error });
        }
        setIsSubmitting(false);
    }
    
  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Report Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a Lost or Found Item</DialogTitle>
          <DialogDescription>
            Fill out the details below to report an item. This will be reviewed by a community leader.
          </DialogDescription>
        </DialogHeader>
         <Alert>
            <AlertTitle>Communication Disclaimer</AlertTitle>
            <AlertDescription>
                You will be contacted via the platform's chat page regarding this item. Please refer to the generated Item ID in your correspondence.
            </AlertDescription>
        </Alert>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-2">
                <Label htmlFor="item-type">Item Type *</Label>
                <Select value={itemType} onValueChange={(val: 'lost' | 'found') => setItemType(val)}>
                    <SelectTrigger id="item-type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="lost">I Lost Something</SelectItem>
                        <SelectItem value="found">I Found Something</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" placeholder="e.g., A set of keys with a blue lanyard and a small car keychain" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="location">Last Known Location *</Label>
                <Input id="location" placeholder="e.g., Near the benches at Central Park" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="date">Date Lost/Found *</Label>
                <DatePicker date={date} setDate={setDate} />
            </div>
             <div className="space-y-2">
                <Label>Image</Label>
                {image ? (
                        <div className="relative w-40 h-32">
                        <Image src={image} alt="Preview" fill style={{objectFit:"cover"}} className="rounded-md" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setImage(null)}><X className="h-4 w-4" /></Button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-4 w-4" /> Take Picture</Button>
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
            {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
            <DialogFooter>
                <Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button>
                {videoDevices.length > 1 && (
                    <Button variant="outline" onClick={handleSwitchCamera}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Switch Camera
                    </Button>
                )}
                <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
