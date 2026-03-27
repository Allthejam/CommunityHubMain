
"use client";

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
import { PlusCircle, Loader2, Upload, Camera, X } from "lucide-react";
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

    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
     const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

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
        if (!user || !userProfile?.communityId) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to a community to report an item.'});
            return;
        }
        if (!description || !location || !date) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.'});
            return;
        }

        setIsSubmitting(true);
        const result = await reportLostOrFoundItemAction({
            type: itemType,
            description,
            location,
            date,
            image,
            ownerId: user.uid,
            communityId: userProfile.communityId,
            reporterName: userProfile.name,
        });

        if (result.success) {
            toast({ title: 'Report Submitted', description: 'Your report has been sent for review.' });
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
            <div className="flex gap-2"><Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button><Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button></div>
        </DialogContent>
    </Dialog>
    </>
  );
}
