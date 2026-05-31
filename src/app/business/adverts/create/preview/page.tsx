"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Send, ExternalLink, Mail, ArrowRight, Loader2, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type AdData = {
    businessId: string;
    businessName: string;
    title: string;
    price: string;
    description: string;
    image: string | null;
    startDate?: string;
    endDate?: string;
};

const AdPreviewCard = ({ title, businessName, image, description, startDate, endDate }: AdData) => {
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
                     <div 
                        className="prose dark:prose-invert max-w-none text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: description || "<p>Your compelling description will appear here.</p>" }} 
                    />
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
                    <Button className="w-full">Get Offer</Button>
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
            const storedData = sessionStorage.getItem('businessAdvertPreview');
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
                    <Link href="/business/adverts/create">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Create an Advert
                    </Link>
                </Button>
            </div>
        )
    }
    
    const handleProceed = () => {
        router.push(`/business/adverts/create/targeting`);
    }

    return (
        <div className="space-y-8">
             <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/business/adverts/create">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Editing
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Campaign Preview (Step 2 of 3)
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
                 <Button asChild size="lg" variant="outline">
                    <Link href="/business/adverts/create">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back and Edit
                    </Link>
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
