
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDocs, collection, query, where, documentId } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import {
    ArrowLeft,
    Loader2,
    Globe,
    Mail,
    Phone,
    MapPin,
    Share2,
    Camera,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";


type GalleryImage = {
    url: string;
    description?: string;
}

type CommunitySelection = {
  id: string | null;
  country: string | null;
  state: string | null;
  region: string | null;
  community: string | null;
};

type BusinessProfile = {
    name?: string; // Legacy field
    businessName?: string;
    businessCategory?: string;
    shortDescription?: string;
    longDescription?: string;
    logoImage?: string;
    bannerImage?: string;
    website?: string;
    contactEmail?: string;
    contactNumber?: string;
    socialMedia?: string;
    addresses?: { addressLine1: string, city: string, postcode: string }[];
    primaryCommunityName?: string;
    gallery?: GalleryImage[];
    additionalCommunities?: CommunitySelection[];
    openingHours?: any;
    pageTwoContent?: { id: string; text: string; image: string | null }[];
    pageThreeContent?: string;
    showPageTwo?: boolean;
    showPageThree?: boolean;
    pageThreeType?: 'custom' | 'minutes';
    meetingMinutes?: { id: string; title: string; date: any; content: string; pdfUrl?: string }[];
    status?: 'Approved' | 'Subscribed' | string; // Add other statuses if needed
};

const hasOpeningHours = (hours: any) => {
    if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return false;
    // Check if any day has been given any time values or is explicitly marked as closed
    return Object.values(hours).some(dayData => {
        if (typeof dayData !== 'object' || dayData === null) return false;
        const d = dayData as any;
        return d.closed === true || d.morningOpen || d.morningClose || d.afternoonOpen || d.afternoonClose;
    });
};

const OpeningHours = ({ hours }: { hours: any }) => {
    if (!hours) return <p className="text-sm text-muted-foreground">Not specified.</p>;

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    return (
        <TooltipProvider>
            <div className="space-y-2 text-sm">
                {days.map(day => {
                    const dayData = hours[day];
                    if (!dayData) return null;
                    
                    const morningSession = dayData.morningOpen && dayData.morningClose ? `${dayData.morningOpen} - ${dayData.morningClose}` : null;
                    const afternoonSession = dayData.afternoonOpen && dayData.afternoonClose ? `${dayData.afternoonOpen} - ${dayData.afternoonClose}` : null;

                    let summaryText;
                    let detailText;

                    if (dayData.closed) {
                        summaryText = 'Closed';
                        detailText = 'Closed all day';
                    } else if (morningSession && afternoonSession) {
                        summaryText = 'Open';
                        detailText = `${morningSession}, ${afternoonSession}`;
                    } else if (morningSession) {
                        summaryText = 'Open';
                        detailText = morningSession;
                    } else if (afternoonSession) {
                        summaryText = 'Open';
                        detailText = afternoonSession;
                    } else {
                        return null; // Don't render if no times and not explicitly closed
                    }

                    return (
                        <div key={day} className="flex justify-between items-center">
                            <span className="capitalize font-medium">{day}</span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground text-xs cursor-help underline decoration-dotted">{summaryText}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{detailText}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )
                })}
            </div>
        </TooltipProvider>
    )
}

export default function BusinessProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { businessId } = params;
    const db = useFirestore();
    const [activeTab, setActiveTab] = React.useState('page1');

    const [additionalCommunityNames, setAdditionalCommunityNames] = React.useState<string[]>([]);
    const [loadingCommunities, setLoadingCommunities] = React.useState(false);

    const businessRef = useMemoFirebase(() => {
        if (!businessId || !db) return null;
        return doc(db, 'businesses', businessId as string);
    }, [businessId, db]);

    const { data: profile, isLoading: loading } = useDoc<BusinessProfile>(businessRef);

    React.useEffect(() => {
        if (profile?.additionalCommunities && profile.additionalCommunities.length > 0 && db) {
            setLoadingCommunities(true);
            const communityIds = profile.additionalCommunities
                .map(c => c.community)
                .filter((id): id is string => !!id && id.trim() !== '');

            if (communityIds.length > 0) {
                const q = query(collection(db, 'communities'), where(documentId(), 'in', communityIds));
                getDocs(q).then(snapshot => {
                    const names = snapshot.docs.map(doc => doc.data().name);
                    setAdditionalCommunityNames(names);
                    setLoadingCommunities(false);
                }).catch(error => {
                    console.error("Error fetching additional communities: ", error);
                    setLoadingCommunities(false);
                });
            } else {
                 setAdditionalCommunityNames([]);
                setLoadingCommunities(false);
            }
        } else {
            setAdditionalCommunityNames([]);
            setLoadingCommunities(false);
        }
    }, [profile, db]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Business Not Found</h1>
                <p className="text-muted-foreground">This business profile could not be found or has been removed.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/directory"><ArrowLeft className="mr-2 h-4 w-4" />Back to Directory</Link>
                </Button>
            </div>
        );
    }
    
    const name = profile.businessName || profile.name || 'Business Name';
    const categoryLabel = profile.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ') || 'Category';
    const primaryAddress = profile.addresses?.[0] ? `${profile.addresses[0].addressLine1}, ${profile.addresses[0].city}, ${profile.addresses[0].postcode}` : 'No address provided';
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const isApproved = profile.status === 'Approved' || profile.status === 'Subscribed';
    const page2Available = isApproved && profile.showPageTwo !== false && profile.pageTwoContent && profile.pageTwoContent.length > 0;
    
    const page3Type = profile.pageThreeType || 'custom';
    const page3MinutesAvailable = page3Type === 'minutes' && isApproved && profile.showPageThree !== false && profile.meetingMinutes && profile.meetingMinutes.length > 0;
    const page3CustomAvailable = page3Type === 'custom' && isApproved && profile.showPageThree !== false && profile.pageThreeContent;
    const page3Available = page3MinutesAvailable || page3CustomAvailable;
    const page3TabTitle = page3Type === 'minutes' ? 'Meeting Minutes' : 'Contact Us';

    return (
        <div className="max-w-6xl mx-auto">
             <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <Card className="overflow-hidden">
                <div className="relative">
                    {profile.bannerImage ? (
                        <Image src={profile.bannerImage} alt={`${name} banner`} width={1200} height={300} className="w-full h-48 md:h-64 object-cover" priority />
                    ) : <div className="h-48 md:h-64 bg-muted w-full" />}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                     <div className="absolute bottom-0 left-0 p-6 flex items-end gap-4">
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 border-background overflow-hidden -mb-12 md:-mb-16 bg-card">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={profile.logoImage} alt={`${name} logo`} className="object-contain" />
                                <AvatarFallback className="text-4xl">{getInitials(name)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div>
                             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-headline">
                                {name}
                            </h1>
                             <p className="text-white/90 text-lg">{categoryLabel}</p>
                        </div>
                     </div>
                </div>

                <div className="p-6 pt-16 md:pt-20">
                   <div className="grid md:grid-cols-3 gap-8">
                       <div className="md:col-span-2 space-y-8">
                            {activeTab === 'page1' && (
                                <>
                                    <div>
                                        <h2 className="text-2xl font-semibold font-headline">About {name}</h2>
                                        {profile.shortDescription && <p className="mt-4 text-lg text-muted-foreground font-light leading-relaxed">{profile.shortDescription}</p>}
                                        <div className="prose dark:prose-invert max-w-none text-muted-foreground mt-4" dangerouslySetInnerHTML={{ __html: profile.longDescription || ""}}/>
                                    </div>
                                    
                                    {profile.gallery && profile.gallery.length > 0 && (
                                        <div>
                                            <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center gap-2"><Camera /> Gallery</h2>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {profile.gallery.map((image, index) => (
                                                    <Dialog key={index}>
                                                        <DialogTrigger asChild>
                                                            <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                                                                <Image
                                                                    src={image.url}
                                                                    alt={image.description || `Gallery image ${index + 1}`}
                                                                    fill
                                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />
                                                            </div>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-3xl">
                                                            <DialogHeader>
                                                                <DialogTitle>{image.description || `${name} - Image ${index + 1}`}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="relative aspect-video">
                                                                <Image
                                                                    src={image.url}
                                                                    alt={image.description || `Gallery image ${index + 1}`}
                                                                    fill
                                                                    className="object-contain"
                                                                />
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                             {activeTab === 'page2' && page2Available && (
                                <div className="space-y-8">
                                    {profile.pageTwoContent?.map((block, index) => {
                                        const isReversed = index % 2 !== 0;
                                        const textContent = <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: block.text }} />;
                                        const imageContent = block.image && (
                                            <div className="relative aspect-video rounded-lg overflow-hidden">
                                                <Image src={block.image} alt={`Content image ${index + 1}`} fill className="object-cover" />
                                            </div>
                                        );

                                        return (
                                            <div key={block.id} className="grid md:grid-cols-2 gap-8 items-center">
                                                {isReversed ? (
                                                    <>
                                                        {imageContent}
                                                        {textContent}
                                                    </>
                                                ) : (
                                                    <>
                                                        {textContent}
                                                        {imageContent}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                             {activeTab === 'page3' && page3Available && (
                                page3Type === 'custom' ? (
                                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: profile.pageThreeContent || ""}}/>
                                ) : (
                                    <div className="space-y-4">
                                        {profile.meetingMinutes?.map(minute => (
                                            <Card key={minute.id}>
                                                <CardHeader>
                                                    <CardTitle className="text-lg">{minute.title}</CardTitle>
                                                    <CardDescription>{format(new Date(minute.date.seconds * 1000), 'PPP')}</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: minute.content }}/>
                                                </CardContent>
                                                {minute.pdfUrl && <CardFooter><Button asChild><a href={minute.pdfUrl} target="_blank" rel="noopener noreferrer">Download PDF</a></Button></CardFooter>}
                                            </Card>
                                        ))}
                                    </div>
                                )
                            )}
                       </div>
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="p-2">
                                    <div className="flex flex-col gap-1">
                                        <Button variant={activeTab === 'page1' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('page1')} className="justify-start">Profile</Button>
                                        <Button variant={activeTab === 'page2' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('page2')} disabled={!page2Available} className="justify-start">Page 2</Button>
                                        <Button variant={activeTab === 'page3' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('page3')} disabled={!page3Available} className="justify-start">{page3TabTitle}</Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Contact & Links</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryAddress)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{primaryAddress}</a>
                                    </div>
                                    {profile.contactNumber && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={`tel:${profile.contactNumber}`} className="text-primary hover:underline break-all">{profile.contactNumber}</a>
                                    </div>
                                    )}
                                    {profile.contactEmail && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={`mailto:${profile.contactEmail}`} className="text-primary hover:underline break-all">{profile.contactEmail}</a>
                                    </div>
                                    )}
                                    {profile.website && (
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">Visit Website</a>
                                    </div>
                                    )}
                                    {profile.socialMedia && (
                                    <div className="flex items-center gap-3">
                                        <Share2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={profile.socialMedia.startsWith('http') ? profile.socialMedia : `https://${profile.socialMedia}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">Social Media</a>
                                    </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Communities</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div>
                                        <p className="font-semibold">Primary Community</p>
                                        <p className="text-muted-foreground">{profile.primaryCommunityName || 'Not specified'}</p>
                                    </div>
                                    {loadingCommunities ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                                    additionalCommunityNames.length > 0 && (
                                        <div>
                                            <p className="font-semibold mt-2">Also in</p>
                                            <ul className="list-disc pl-5 text-muted-foreground">
                                                {additionalCommunityNames.map((name, index) => (
                                                    <li key={index}>{name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            {hasOpeningHours(profile.openingHours) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Clock className="h-5 w-5" /> Opening Hours
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <OpeningHours hours={profile.openingHours} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                   </div>
                </div>
            </Card>
        </div>
    );
}

    
