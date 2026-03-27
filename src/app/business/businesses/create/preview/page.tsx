
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Globe, Mail, Phone, MapPin, Share2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type BusinessProfilePreview = {
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
};

const PreviewPageContent = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [profile, setProfile] = React.useState<BusinessProfilePreview | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        try {
            const storedProfile = sessionStorage.getItem('businessProfilePreview');
            if (storedProfile) {
                setProfile(JSON.parse(storedProfile));
            }
        } catch (error) {
            console.error("Failed to parse profile data from sessionStorage", error);
            toast({
                title: "Could Not Load Preview",
                description: "There was an error reading the preview data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (!profile) {
        return (
             <div className="text-center">
                <h1 className="text-2xl font-bold">No Preview Data Found</h1>
                <p className="text-muted-foreground">Please go back to the creation page and click "Preview Profile" again.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/business/businesses/create">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Editing
                    </Link>
                </Button>
            </div>
        )
    }

    const name = profile.businessName || 'Your Business Name';
    const categoryLabel = profile.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ') || 'Category';
    const primaryAddress = profile.addresses?.[0] ? `${profile.addresses[0].addressLine1}, ${profile.addresses[0].city}, ${profile.addresses[0].postcode}` : 'No address provided';

    return (
        <div className="space-y-8">
             <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/business/businesses/create">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Editing
                    </Link>
                </Button>
                 <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Business Profile Preview
                </h1>
                <p className="text-muted-foreground mt-2">
                   This is a preview of how your public business profile will appear.
                </p>
            </div>
            
            <Card className="overflow-hidden">
                <div className="relative">
                    {profile.bannerImage ? (
                        <Image src={profile.bannerImage} alt={`${name} banner`} width={1200} height={300} className="w-full h-48 md:h-64 object-cover" priority />
                    ) : <div className="h-48 md:h-64 bg-muted w-full" />}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                     <div className="absolute bottom-0 left-0 p-6 flex items-end gap-4">
                        {profile.logoImage && (
                            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 border-background overflow-hidden -mb-12 md:-mb-16 bg-card">
                                <Image src={profile.logoImage} alt={`${name} logo`} fill className="object-contain p-2" />
                            </div>
                        )}
                        <div>
                             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-headline">
                                {name}
                            </h1>
                             <p className="text-white/90 text-lg">{categoryLabel}</p>
                        </div>
                     </div>
                </div>
                 <div className="pt-16 md:pt-20 p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                             <div>
                                <h2 className="text-2xl font-semibold font-headline">About {name}</h2>
                                <p className="mt-4 text-lg text-muted-foreground font-light leading-relaxed">{profile.shortDescription}</p>
                                <div className="prose dark:prose-invert max-w-none text-muted-foreground mt-4" dangerouslySetInnerHTML={{ __html: profile.longDescription || ""}}/>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Contact & Links</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <span className="text-muted-foreground">{primaryAddress}</span>
                                    </div>
                                    {profile.contactNumber && (
                                      <div className="flex items-center gap-3">
                                          <Phone className="h-4 w-4 text-muted-foreground" />
                                          <a href={`tel:${profile.contactNumber}`} className="text-primary hover:underline">{profile.contactNumber}</a>
                                      </div>
                                    )}
                                    {profile.contactEmail && (
                                      <div className="flex items-center gap-3">
                                          <Mail className="h-4 w-4 text-muted-foreground" />
                                          <a href={`mailto:${profile.contactEmail}`} className="text-primary hover:underline">{profile.contactEmail}</a>
                                      </div>
                                    )}
                                    {profile.website && (
                                      <div className="flex items-center gap-3">
                                          <Globe className="h-4 w-4 text-muted-foreground" />
                                          <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Visit Website</a>
                                      </div>
                                    )}
                                     {profile.socialMedia && (
                                      <div className="flex items-center gap-3">
                                          <Share2 className="h-4 w-4 text-muted-foreground" />
                                          <a href={profile.socialMedia.startsWith('http') ? profile.socialMedia : `https://${profile.socialMedia}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Social Media</a>
                                      </div>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Primary Community</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{profile.primaryCommunityName}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                 </div>
            </Card>
        </div>
    );
}

export default function BusinessPreviewPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PreviewPageContent />
        </React.Suspense>
    );
}
