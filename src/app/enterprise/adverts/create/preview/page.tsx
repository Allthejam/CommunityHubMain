

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Send, ExternalLink, Mail, ArrowRight, Loader2, Building, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveAdvertAsDraft } from "@/lib/actions/advertActions";
import { useUser } from "@/firebase";

type AdData = {
    id?: string;
    type: string;
    headline: string;
    shortDescription: string;
    fullDescription: string;
    image: string | null;
    primaryLinkType: string | null;
    websiteLink: string | null;
    emailAddress: string | null;
}

const AdPreviewCard = ({ name, tagline, image, linkType, linkValue, fullDescription }: { name: string, tagline: string, image: string, linkType: string | null, linkValue: string | null, fullDescription: string }) => {
    return (
        <div className="p-1">
            <h3 className="text-center font-semibold mb-2">Featured Carousel Preview</h3>
            <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2 items-center">
                    <div className="p-6 sm:p-8 lg:p-12 order-2 md:order-1">
                        <h3 className="text-2xl lg:text-3xl font-bold font-headline">{name}</h3>
                        <p className="mt-2 text-muted-foreground lg:text-lg">{tagline}</p>
                        <div className="flex gap-2 mt-4">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>Learn More</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4" dangerouslySetInnerHTML={{ __html: fullDescription }} />
                                </DialogContent>
                            </Dialog>
                            {linkType === 'website' && linkValue && (
                                <Button asChild variant="outline">
                                    <Link href={linkValue} target="_blank">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Visit Site
                                    </Link>
                                </Button>
                            )}
                             {linkType === 'email' && linkValue && (
                                <Button asChild variant="outline">
                                    <Link href={`mailto:${linkValue}`}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Contact Us
                                    </Link>
                                </Button>
                            )}
                            {linkType === 'profile' && (
                                <Button asChild variant="outline">
                                    <Link href={`/enterprise/company-profile/preview`} target="_blank">
                                        <Building className="mr-2 h-4 w-4" />
                                        View Profile
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="h-64 md:h-full w-full order-1 md:order-2">
                        <div className="relative h-full w-full">
                             <Image
                                src={image}
                                alt={name}
                                fill
                                className="object-cover"
                                data-ai-hint="advertisement image"
                            />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

const PartnerAdPreviewCard = ({ name, tagline, image, linkType, linkValue, fullDescription }: { name: string, tagline: string, image: string, linkType: string | null, linkValue: string | null, fullDescription: string }) => {
    return (
        <div className="p-1">
             <h3 className="text-center font-semibold mb-2">Valued Partner Preview</h3>
            <Card className="flex flex-col overflow-hidden h-full">
                <CardHeader className="p-0 relative">
                    <div className="aspect-video w-full">
                         <div className="relative h-full w-full">
                             <Image
                                src={image}
                                alt={name}
                                fill
                                className="object-cover"
                                data-ai-hint="advertisement image"
                            />
                         </div>
                    </div>
                </CardHeader>
                <CardHeader>
                    <CardTitle className="text-lg">{name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{tagline}</p>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2">
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button className="w-full">Learn More</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{name}</DialogTitle>
                            </DialogHeader>
                            <div className="py-4" dangerouslySetInnerHTML={{ __html: fullDescription }}/>
                        </DialogContent>
                    </Dialog>
                      {linkType === 'website' && linkValue && (
                        <Button asChild variant="outline" className="w-full">
                            <Link href={linkValue} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Visit Site
                            </Link>
                        </Button>
                    )}
                     {linkType === 'email' && linkValue && (
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`mailto:${linkValue}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                Contact Us
                            </Link>
                        </Button>
                    )}
                     {linkType === 'profile' && (
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/enterprise/company-profile/preview`} target="_blank">
                                <Building className="mr-2 h-4 w-4" />
                                View Profile
                            </Link>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}


const PreviewPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const advertType = searchParams.get('type') || 'featured';
    const isOwnerAd = searchParams.get('owner') === 'true';
    const advertId = searchParams.get('id');

    const { toast } = useToast();
    const [adData, setAdData] = React.useState<AdData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);

    React.useEffect(() => {
        try {
            const storedData = sessionStorage.getItem('advertPreviewData');
            if (storedData) {
                setAdData(JSON.parse(storedData));
            }
        } catch (error) {
            console.error("Failed to parse ad data from sessionStorage", error);
            toast({
                title: "Could not load preview",
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
    
    if (!adData) {
        return (
             <div className="text-center">
                <h1 className="text-2xl font-bold">No Preview Data Found</h1>
                <p className="text-muted-foreground">Please go back and create an advert first.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href={`/enterprise/adverts/create?type=${advertType}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Create an Advert
                    </Link>
                </Button>
            </div>
        )
    }
    
    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        if (!adData) return;

        setIsSavingDraft(true);
        const draftData = {
            id: adData.id,
            type: adData.type,
            title: adData.headline,
            headline: adData.headline,
            shortDescription: adData.shortDescription,
            fullDescription: adData.fullDescription,
            primaryLinkType: adData.primaryLinkType,
            websiteLink: adData.websiteLink,
            emailAddress: adData.emailAddress,
            image: adData.image,
        };

        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: draftData });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your campaign progress has been saved." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };


    const { type, headline, shortDescription, image, primaryLinkType, websiteLink, emailAddress, fullDescription } = adData;
    const linkValue = primaryLinkType === 'website' ? websiteLink : emailAddress;
    const adTypeName = type === 'featured' ? 'Featured Ad' : 'Partner Ad';

    const handleProceed = () => {
        let targetingUrl = `/enterprise/adverts/create/targeting?type=${advertType}`;
        if (isOwnerAd) targetingUrl += '&owner=true';
        if (advertId) targetingUrl += `&id=${advertId}`;
        router.push(targetingUrl);
    }
    
    const handleBack = () => {
        let backUrl = `/enterprise/adverts/create?type=${advertType}`;
        if (isOwnerAd) backUrl += '&owner=true';
        if (advertId) backUrl += `&id=${advertId}`;
        router.push(backUrl);
    }

    return (
        <div className="space-y-8">
             <div>
                <Button variant="ghost" className="mb-4" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Editing
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Campaign Preview (Step 3 of 4)
                </h1>
                <p className="text-muted-foreground mt-2">
                   This is how your <span className="font-semibold">{adTypeName}</span> will appear to the community.
                </p>
            </div>
            
             <Alert>
                <Eye className="h-4 w-4" />
                <AlertTitle>Live Preview</AlertTitle>
                <AlertDescription>
                    The card below demonstrates how your advert will look on the platform. The image is cropped to fit the container, ensuring a consistent and clean layout on the live site.
                </AlertDescription>
            </Alert>
            
            <div className="flex justify-center items-center">
                 <div className="w-full max-w-4xl">
                     {type === 'featured' ? (
                        <AdPreviewCard name={headline} tagline={shortDescription} image={image || 'https://picsum.photos/800/600'} linkType={primaryLinkType} linkValue={linkValue} fullDescription={fullDescription} />
                    ) : (
                        <div className="max-w-sm mx-auto">
                            <PartnerAdPreviewCard name={headline} tagline={shortDescription} image={image || 'https://picsum.photos/800/600'} linkType={primaryLinkType} linkValue={linkValue} fullDescription={fullDescription} />
                        </div>
                    )}
                 </div>
            </div>

            <div className="flex justify-center flex-wrap gap-4">
                 <Button onClick={handleProceed} size="lg">
                    Proceed to Targeting
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={handleBack} size="lg" variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back and Edit
                </Button>
                 <Button variant="outline" size="lg" onClick={handleSaveDraft} disabled={isSavingDraft}>
                    {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Draft
                </Button>
            </div>
        </div>
    )
}

const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
);

export default function PreviewAdvertPage() {
    return (
        <React.Suspense fallback={<SuspenseFallback />}>
            <PreviewPageContent />
        </React.Suspense>
    );
}
