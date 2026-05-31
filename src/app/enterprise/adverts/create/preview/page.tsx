"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Send, ExternalLink, Mail, ArrowRight, Loader2, Calendar, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type AdData = {
    id?: string;
    businessId: string;
    businessName: string;
    title: string;
    price: string;
    shortDescription: string;
    description: string; // This is fullDescription
    image: string | null;
    startDate?: string;
    endDate?: string;
    primaryLinkType: 'website' | 'email' | 'profile';
    websiteLink?: string;
    emailAddress?: string;
    type?: string;
};

const AdPreviewCard = (adData: AdData) => {
    const { title, businessName, image, description, shortDescription, startDate, endDate, primaryLinkType, websiteLink, emailAddress, businessId } = adData;
    
    const GetOfferButton = () => {
        if (primaryLinkType === 'email' && emailAddress) {
          return (
            <Button asChild className="w-full">
              <a href={`mailto:${emailAddress}`}>Get Offer via Email</a>
            </Button>
          );
        }
        if (primaryLinkType === 'website' && websiteLink) {
          return (
            <Button asChild className="w-full">
              <a href={websiteLink} target="_blank" rel="noopener noreferrer">Get Offer</a>
            </Button>
          );
        }
        if (primaryLinkType === 'profile' && businessId) {
             return (
                 <Button asChild className="w-full">
                    <Link href={`/businesses/${businessId}`}>View Company Profile</Link>
                 </Button>
             )
        }
        return <Button className="w-full" disabled>Get Offer</Button>;
    };

    return (
        <div className="p-1">
            <h3 className="text-center font-semibold mb-2">Advert Preview</h3>
            <Card className="flex flex-col overflow-hidden h-full">
                <CardHeader className="p-0 relative">
                    <div className="aspect-[4/3] w-full relative bg-muted">
                         <Image
                            src={image || 'https://picsum.photos/800/600'}
                            alt={title}
                            fill
                            className="w-full h-full object-cover"
                            data-ai-hint="advertisement image"
                        />
                    </div>
                </CardHeader>
                <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription>From: {businessName}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                     <p className="text-sm text-muted-foreground">{shortDescription}</p>
                    {(startDate || endDate) && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {startDate && `Starts: ${format(new Date(startDate), "PPP")}`}
                                {startDate && endDate && ' | '}
                                {endDate && `Ends: ${format(new Date(endDate), "PPP")}`}
                            </span>
                        </div>
                    )}
                </CardContent>
                 <CardFooter className="flex-col items-start gap-2">
                    <GetOfferButton />
                </CardFooter>
            </Card>
        </div>
    )
}


const PreviewPageContent = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [adData, setAdData] = React.useState<AdData | null>(null);
    const [loading, setLoading] = React.useState(true);

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
                    <Link href="/enterprise/adverts/create">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Create an Advert
                    </Link>
                </Button>
            </div>
        )
    }
    
    const handleProceed = () => {
        let url = `/enterprise/adverts/create/targeting?type=${adData.type || 'local'}`;
        if (adData.id) {
            url += `&id=${adData.id}`;
        }
        router.push(url);
    }

    const handleBack = () => {
        const backUrl = adData.id 
            ? `/enterprise/adverts/edit/${adData.id}` 
            : "/enterprise/adverts/create";
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
                    Campaign Preview (Step 2 of 4)
                </h1>
                <p className="text-muted-foreground mt-2">
                   This is how your advert will appear to the community.
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
                 <div className="w-full max-w-sm">
                    <AdPreviewCard {...adData} />
                 </div>
            </div>

            <div className="flex justify-center gap-4">
                 <Button onClick={handleProceed} size="lg">
                    Proceed to Targeting
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                 <Button onClick={handleBack} size="lg" variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back and Edit
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
