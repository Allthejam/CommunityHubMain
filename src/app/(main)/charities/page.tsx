

"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Info, Upload, Camera, X, LayoutGrid, List } from "lucide-react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { applyForCharityListingAction } from "@/lib/actions/charityActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Charity = {
  id: string;
  title: string;
  description: string;
  image: string;
  dataAiHint?: string;
  category: string;
  website?: string;
};

const CharityCard = ({ charity }: { charity: Charity }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <div className="relative w-full aspect-square bg-muted">
                    <Image
                      src={charity.image || "https://picsum.photos/seed/charity/600/400"}
                      alt={charity.title}
                      fill
                      className="object-cover"
                      data-ai-hint={charity.dataAiHint || "charity work"}
                    />
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                 <CardTitle className="text-base line-clamp-2">{charity.title}</CardTitle>
              </CardContent>
              <CardFooter className="p-4 pt-0 mt-auto">
                <div className="text-sm font-medium text-primary w-full text-center">Learn more</div>
              </CardFooter>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg grid grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh]">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle>{charity.title}</DialogTitle>
                <DialogDescription>
                   Local Charity
                </DialogDescription>
            </DialogHeader>
            <div className="grid overflow-y-auto">
              <ScrollArea className="px-6">
                  <div className="space-y-4 pr-1 pb-4">
                      <div className="relative w-full aspect-video rounded-md overflow-hidden">
                          <Image src={charity.image || "https://picsum.photos/seed/charity-dialog/600/400"} alt={charity.title} fill className="object-cover" />
                      </div>
                       <div className="text-sm text-muted-foreground prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: charity.description || '' }} />
                  </div>
              </ScrollArea>
            </div>
             <DialogFooter className="p-6 pt-4 border-t sm:justify-start">
                {charity.website ? (
                    <Button asChild>
                        <Link href={!charity.website.startsWith('http') ? `https://${charity.website}` : charity.website} target="_blank" rel="noopener noreferrer">
                            Donate or Volunteer
                        </Link>
                    </Button>
                ) : (
                    <Button disabled>No Website Provided</Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

const CharityRow = ({ charity }: { charity: Charity }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="flex items-center p-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="relative h-16 w-16 flex-shrink-0 mr-4 rounded-md overflow-hidden">
                    <Image
                        src={charity.image || 'https://picsum.photos/seed/charity-list/400'}
                        alt={charity.title}
                        fill
                        className="object-cover"
                        data-ai-hint={charity.dataAiHint || "charity work"}
                    />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold">{charity.title}</h3>
                    <p className="text-sm text-muted-foreground">{charity.category}</p>
                </div>
                <Button variant="secondary" size="sm" className="ml-4">Learn More</Button>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg grid grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh]">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle>{charity.title}</DialogTitle>
                <DialogDescription>
                   Local Charity
                </DialogDescription>
            </DialogHeader>
            <div className="grid overflow-y-auto">
              <ScrollArea className="px-6">
                  <div className="space-y-4 pr-1 pb-4">
                      <div className="relative w-full aspect-video rounded-md overflow-hidden">
                          <Image src={charity.image || "https://picsum.photos/seed/charity-dialog/600/400"} alt={charity.title} fill className="object-cover" />
                      </div>
                       <div className="text-sm text-muted-foreground prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: charity.description || '' }} />
                  </div>
              </ScrollArea>
            </div>
             <DialogFooter className="p-6 pt-4 border-t sm:justify-start">
                {charity.website ? (
                    <Button asChild>
                        <Link href={!charity.website.startsWith('http') ? `https://${charity.website}` : charity.website} target="_blank" rel="noopener noreferrer">
                            Donate or Volunteer
                        </Link>
                    </Button>
                ) : (
                    <Button disabled>No Website Provided</Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);


const ApplyForListingDialog = () => {
    const { user } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [website, setWebsite] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

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

    const handleSubmit = async () => {
        if (!userProfile?.communityId) {
            toast({ variant: "destructive", title: "Error", description: "Could not determine your community." });
            return;
        }
        if (!title || !description || !contactPerson || !contactNumber) {
            toast({ variant: "destructive", title: "Missing Fields", description: "Please fill out all required fields." });
            return;
        }

        setIsSubmitting(true);
        const result = await applyForCharityListingAction({
            title,
            description,
            website,
            contactPerson,
            contactNumber,
            image,
            communityId: userProfile.communityId,
            userId: user?.uid || "",
        });
        setIsSubmitting(false);

        if (result.success) {
            toast({ title: "Application Submitted", description: "Your application has been sent for review." });
            setOpen(false);
        } else {
            toast({ variant: "destructive", title: "Submission Failed", description: result.error });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Apply to be Listed</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Charity Listing Application</DialogTitle>
                    <DialogDescription>Submit your charity's details for review by a community leader.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="space-y-2">
                        <Label htmlFor="charity-name">Charity Name *</Label>
                        <Input id="charity-name" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="charity-description">Description *</Label>
                        <RichTextEditor value={description} onChange={setDescription} placeholder="Describe your charity's mission and work..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="charity-website">Website</Label>
                        <Input id="charity-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Image / Logo</Label>
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
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Internal Contact Details</AlertTitle>
                        <AlertDescription>This information is for verification purposes only and will NOT be displayed publicly.</AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact-person">Your Full Name *</Label>
                            <Input id="contact-person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-number">Your Contact Number *</Label>
                            <Input id="contact-number" type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Application
                    </Button>
                </DialogFooter>
                 <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                        {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
                        <div className="flex gap-2"><Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button><Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button></div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    )
}

export default function CharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [view, setView] = React.useState('grid');
  
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const charitiesQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
        collection(db, "charities"),
        where("communityId", "==", userProfile.communityId),
        where("status", "==", "Active")
    );
  }, [db, userProfile?.communityId]);

  const { data: charitiesData, isLoading: itemsLoading } = useCollection<Charity>(charitiesQuery);

  useEffect(() => {
      setLoading(authLoading || profileLoading || itemsLoading);
      if (charitiesData) {
          setCharities(charitiesData);
      }
  }, [authLoading, profileLoading, itemsLoading, charitiesData]);

  const categories = useMemo(() => {
    if (!charities) return ["All"];
    const uniqueCategories = new Set(charities.map(c => c.category));
    return ["All", ...Array.from(uniqueCategories)];
  }, [charities]);

  const filteredCharities = useMemo(() => {
    if (activeFilter === "All") return charities;
    return charities.filter(charity => charity.category === activeFilter);
  }, [charities, activeFilter]);
    
  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  return (
    <div className="space-y-8 container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Heart className="h-8 w-8 text-primary" />
                Local Charities
            </h1>
            <p className="text-muted-foreground">
              Find and support non-profit organizations making a difference in your community.
            </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <ApplyForListingDialog />
          <div className="flex items-center gap-1 rounded-md bg-muted p-1">
            <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')}>
                <LayoutGrid className="h-5 w-5" />
                <span className="hidden sm:inline ml-2">Grid</span>
            </Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>
                <List className="h-5 w-5" />
                 <span className="hidden sm:inline ml-2">List</span>
            </Button>
        </div>
        </div>
      </div>

       <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeFilter === category ? "default" : "outline"}
            onClick={() => setActiveFilter(category)}
          >
            {category}
          </Button>
        ))}
      </div>

        {view === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCharities && filteredCharities.length > 0 ? (
                filteredCharities.map((charity) => (
                    <CharityCard key={charity.id} charity={charity} />
              ))
            ) : (
                 <Card className="col-span-full h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No charities found for this category.</p>
                </Card>
            )}
          </div>
        ) : (
            <div className="space-y-4">
                {filteredCharities && filteredCharities.length > 0 ? (
                    filteredCharities.map((charity) => (
                        <CharityRow key={charity.id} charity={charity} />
                    ))
                ) : (
                    <Card className="col-span-full h-48 flex items-center justify-center">
                        <p className="text-muted-foreground">No charities found for this category.</p>
                    </Card>
                )}
            </div>
        )}
    </div>
  );
}
