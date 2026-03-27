
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Save,
    Loader2,
    Upload,
    Newspaper,
    Sparkles,
    Camera,
    X,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { RichTextEditor } from "@/components/rich-text-editor";
import { runCreateNewsStory, runProofreadText, type ProofreadTextOutput } from "@/lib/actions/newsActions";
import Image from "next/image";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { runSpellCheck } from "@/lib/actions";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { doc, getDoc } from "firebase/firestore";
import { runSaveNewsCategories } from "@/lib/actions/communityActions";

const initialCategories = ["Community news", "local sports", "council updates", "Business spotlight", "opinion", "Other"];

export default function CreateNewsStoryPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);


    const [title, setTitle] = React.useState("");
    const [category, setCategory] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [content, setContent] = React.useState("");
    const [image, setImage] = React.useState<string | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isProofreading, setIsProofreading] = React.useState(false);
    
    const [categories, setCategories] = React.useState(initialCategories);
    const [showNewCategoryInput, setShowNewCategoryInput] = React.useState(false);
    const [newCategoryInput, setNewCategoryInput] = React.useState("");
    const [isCheckingSpell, setIsCheckingSpell] = React.useState(false);

    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);

    const [proofreadData, setProofreadData] = React.useState<ProofreadTextOutput | null>(null);

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    
    const communityId = userProfile?.communityId;

    React.useEffect(() => {
        if (!communityId || !db) return;

        const fetchCategories = async () => {
            const communityRef = doc(db, 'communities', communityId);
            const docSnap = await getDoc(communityRef);
            if (docSnap.exists() && docSnap.data().newsCategories) {
                setCategories(docSnap.data().newsCategories);
            } else {
                setCategories(initialCategories);
            }
        };
        fetchCategories();
    }, [communityId, db]);


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
                    console.error("Error accessing camera:", error);
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({
                        variant: "destructive",
                        title: "Camera Access Denied",
                        description: "Please enable camera permissions in your browser settings to use this feature.",
                    });
                }
            };
            getCameraPermission();
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    }, [isCameraOpen, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setImage(dataUrl);
            setIsCameraOpen(false);
        }
    };


    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Convert file to dataURL to show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };
    
    const handleProofread = async () => {
        if (!content) {
            toast({ title: "Nothing to proofread!", description: "Please write some content first.", variant: "destructive" });
            return;
        }
        setIsProofreading(true);
        try {
            const result = await runProofreadText({ text: content });
            setProofreadData(result);
        } catch (error: any) {
            toast({ title: "Error", description: "Could not proofread the content.", variant: "destructive" });
        } finally {
            setIsProofreading(false);
        }
    };
    
    const handleAcceptProofread = () => {
        if (proofreadData) {
            setContent(proofreadData.proofreadText);
            setProofreadData(null);
            toast({ title: "Content Updated", description: "AI suggestions have been applied." });
        }
    };

    const handleCategorySelect = (value: string) => {
        if (value === 'add-new') {
            setShowNewCategoryInput(true);
            setCategory('');
        } else {
            setShowNewCategoryInput(false);
            setCategory(value);
        }
    };

    const handleAddNewCategory = async () => {
        if (!newCategoryInput.trim() || !communityId) return;
        
        setIsCheckingSpell(true);
        const result = await runSpellCheck({ text: newCategoryInput });
        const correctedCategory = result.correctedText;
        setIsCheckingSpell(false);
        
        const newCategories = [...categories];
        if (!newCategories.find(c => c.toLowerCase() === correctedCategory.toLowerCase())) {
            newCategories.push(correctedCategory);
        }
        
        setCategories(newCategories);
        setCategory(correctedCategory);
        setShowNewCategoryInput(false);
        setNewCategoryInput("");

        // Persist the new list to the database
        await runSaveNewsCategories({ communityId, categories: newCategories });
    };

    const handlePreview = () => {
        const storyData = {
            title,
            category,
            shortDescription,
            content,
            image,
            authorName: userProfile?.name,
            date: new Date().toISOString(),
        };
        sessionStorage.setItem('newsStoryPreview', JSON.stringify(storyData));
        window.open('/leader/news/preview', '_blank');
    };

    const handleSubmit = async (status: 'Draft' | 'Pending Approval') => {
        if (!user || !userProfile?.communityId) {
            toast({ title: "Error", description: "You must be logged in and part of a community.", variant: "destructive" });
            return;
        }
        if (!title || !category || !content) {
            toast({ title: "Missing Fields", description: "Please fill in title, category, and content.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await runCreateNewsStory({
                title,
                category,
                shortDescription,
                content,
                image: image,
                authorId: user.uid,
                authorName: userProfile.name,
                communityId: userProfile.communityId,
                status,
            });

            if (result.success) {
                toast({ title: "Success", description: `Story has been saved as ${status}.` });
                router.push('/leader/news');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
        <div className="space-y-8">
            <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/leader/news">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to News Management
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Newspaper className="h-8 w-8" />
                    Create New Story
                </h1>
                <p className="text-muted-foreground">
                   Craft a new story for your community.
                </p>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Story Details</CardTitle>
                    <CardDescription>Fill in the information for your new article.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="story-title">Title *</Label>
                            <Input id="story-title" placeholder="e.g., Local Park Gets a Makeover" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="story-category">Category *</Label>
                            <Select onValueChange={handleCategorySelect} value={showNewCategoryInput ? 'add-new' : category}>
                                <SelectTrigger id="story-category">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                    <SelectItem value="add-new">Set new category...</SelectItem>
                                </SelectContent>
                            </Select>
                            {showNewCategoryInput && (
                                <div className="flex gap-2 pt-2">
                                    <Input 
                                        placeholder="New category name" 
                                        value={newCategoryInput}
                                        onChange={e => setNewCategoryInput(e.target.value)}
                                    />
                                    <Button onClick={handleAddNewCategory} disabled={isCheckingSpell}>
                                        {isCheckingSpell ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        Add
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="image-upload">Featured Image</Label>
                        <div className="flex items-center gap-4">
                             {isCameraOpen ? (
                                <div className="space-y-2 w-full">
                                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                                    {hasCameraPermission === false && (
                                        <Alert variant="destructive">
                                            <AlertTitle>Camera Access Required</AlertTitle>
                                            <AlertDescription>
                                                Please allow camera access in your browser to use this feature.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <div className="flex gap-2">
                                        <Button type="button" onClick={handleCapture} disabled={hasCameraPermission !== true}>
                                            <Camera className="mr-2" /> Capture
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : image ? (
                                <div className="relative w-48 h-32">
                                    <Image src={image} alt="Story image preview" layout="fill" objectFit="cover" className="rounded-md border" />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                                        onClick={() => setImage(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        className="h-auto p-0 border-0 file:h-10 file:px-4 file:py-2 file:border-0 file:rounded-md file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90 max-w-xs"
                                    />
                                     <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} disabled={isUploading}>
                                        <Camera className="mr-2 h-4 w-4" /> Take Picture
                                    </Button>
                                    {isUploading && <Loader2 className="animate-spin" />}
                                </div>
                            )}
                             <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            If helpful, upload or take a picture. Please use a compressed image format (like JPG) to save space. Recommended dimensions: 1200x675 pixels (16:9 aspect ratio).
                        </p>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="short-description">Summary</Label>
                        <Textarea 
                            id="short-description"
                            placeholder="A short snippet that will be displayed on the home page feed..."
                            value={shortDescription}
                            onChange={(e) => setShortDescription(e.target.value)}
                            maxLength={200}
                        />
                        <p className="text-sm text-muted-foreground text-right">{shortDescription.length} / 200</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Story Content *</Label>
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            placeholder="Write your news story here..."
                        />
                         <div className="flex justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={handleProofread} disabled={isProofreading}>
                                {isProofreading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Proofread with AI
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button onClick={() => handleSubmit('Pending Approval')} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                        Submit for Approval
                    </Button>
                    <Button variant="outline" onClick={() => handleSubmit('Draft')} disabled={isSubmitting}>
                        <Save className="mr-2 h-4 w-4" />
                        Save as Draft
                    </Button>
                    <Button variant="secondary" onClick={handlePreview}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Story
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <Dialog open={!!proofreadData} onOpenChange={() => setProofreadData(null)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> AI Proofreading Suggestions</DialogTitle>
                    <DialogDescription>
                        The AI has reviewed your text and suggested the following improvements.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto p-1">
                    <div className="space-y-4">
                         <h3 className="font-semibold">Suggestions</h3>
                         <ul className="space-y-2 text-sm list-disc pl-5 text-muted-foreground">
                            {proofreadData?.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold">Revised Text</h3>
                        <div className="p-4 border rounded-md bg-secondary/50 max-h-96 overflow-y-auto text-sm"
                            dangerouslySetInnerHTML={{ __html: proofreadData?.proofreadText || "" }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAcceptProofread}>Accept Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
