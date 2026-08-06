


"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Target, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { submitAdvertForApprovalAction } from "@/lib/actions/advertActions";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const adCategories = [
    "Sports & Fitness", "Technology & Gaming", "Food & Drink", "Travel & Outdoors",
    "Arts & Culture", "Music & Concerts", "Film & Television", "Reading & Literature",
    "Health & Wellness", "Fashion & Beauty", "Home & Garden", "Business & Finance",
    "Science & Nature", "Education & Learning", "Photography & Video", "DIY & Crafts",
    "Pets & Animals", "Cars & Vehicles", "Family & Parenting", "History & Heritage",
    "Shopping & Retail", "Real Estate", "Environment & Sustainability", "Charity & Volunteering"
];

const ageRanges = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const MAX_CATEGORIES = 15;


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

const TargetingAdvertPageContent = () => {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    
    const [adData, setAdData] = React.useState<AdData | null>(null);
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
    const [targetGender, setTargetGender] = React.useState('all');
    const [targetAgeRanges, setTargetAgeRanges] = React.useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [createdAdvertCount, setCreatedAdvertCount] = React.useState(0);
    const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
    const [loading, setLoading] = React.useState(true);

    const advertsQuery = useMemoFirebase(() => {
        if (!db || !adData?.businessId) return null;
        return query(collection(db, "adverts"), where("businessId", "==", adData.businessId));
    }, [db, adData?.businessId]);
    const { data: advertsData } = useCollection(advertsQuery);

    React.useEffect(() => {
        const storedData = sessionStorage.getItem('businessAdvertPreview');
        if (storedData) {
            setAdData(JSON.parse(storedData));
        } else {
            setLoading(false);
        }
    }, []);
    
    React.useEffect(() => {
        if (!adData?.businessId) {
            setLoading(false);
            return;
        };

        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.business) {
                setBusinessPlan(plans.business);
            }
        };
        fetchPlans();
        
        if (advertsData) {
            setCreatedAdvertCount(advertsData.length);
            setLoading(false);
        }

    }, [adData?.businessId, advertsData]);
    
    const handleCategoryChange = (category: string) => {
        setSelectedCategories(prev => {
            const isSelected = prev.includes(category);
            if (isSelected) {
                return prev.filter(c => c !== category);
            } else {
                if (prev.length < MAX_CATEGORIES) {
                    return [...prev, category];
                } else {
                    toast({
                        title: "Category Limit Reached",
                        description: `You can select a maximum of ${MAX_CATEGORIES} categories.`,
                        variant: "destructive"
                    });
                    return prev;
                }
            }
        });
    };

    const handleAgeRangeChange = (ageRange: string) => {
        setTargetAgeRanges(prev => 
            prev.includes(ageRange)
                ? prev.filter(c => c !== ageRange)
                : [...prev, ageRange]
        );
    };

    const handleSubmit = async () => {
        if (!user || !adData) {
            toast({ title: "Error", description: "You must be logged in to create an advert.", variant: "destructive"});
            return;
        }

        setIsSubmitting(true);
        const result = await submitAdvertForApprovalAction({
            userId: user.uid,
            advertData: adData,
            targeting: {
                categories: selectedCategories,
                gender: targetGender,
                ageRanges: targetAgeRanges,
            }
        });

        if (result.success) {
            toast({
                title: "Advert Submitted!",
                description: "Your advert has been submitted for approval by the community leader.",
            });
            sessionStorage.removeItem('businessAdvertPreview');
            router.push("/business/adverts");
        } else {
            toast({ title: "Submission Failed", description: result.error || "Could not save your advert. Please try again.", variant: "destructive" });
        }
        
        setIsSubmitting(false);
    }

    const freeAdvertsAvailable = (businessPlan?.adverts ?? 3) - createdAdvertCount > 0;
    const advertCost = freeAdvertsAvailable ? 0 : (businessPlan?.additionalAdvertPrice ?? 5);

    const isReadyForSubmit = selectedCategories.length > 0;
    const limitReached = selectedCategories.length >= MAX_CATEGORIES;
    
    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-8">
             <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/business/adverts/create/preview">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Preview
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                   <Target className="h-8 w-8" />
                   Review & Submit (Step 3 of 3)
                </h1>
                <p className="text-muted-foreground mt-2">
                   Confirm your advert details and submit it for approval.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Define Your Campaign</CardTitle>
                    <CardDescription>Select the audience you want to target with this campaign.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <Label>Target Categories *</Label>
                                <p className="text-sm text-muted-foreground">Choose interests that match your intended audience. (Select at least 1, max {MAX_CATEGORIES})</p>
                            </div>
                            <div className={cn("text-sm font-medium", limitReached ? "text-destructive" : "text-muted-foreground")}>
                                {selectedCategories.length} / {MAX_CATEGORIES} selected
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t">
                            {adCategories.map(category => {
                                const isChecked = selectedCategories.includes(category);
                                return (
                                    <div key={category} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`cat-${category}`} 
                                            checked={isChecked}
                                            onCheckedChange={() => handleCategoryChange(category)}
                                            disabled={!isChecked && limitReached}
                                        />
                                        <Label 
                                            htmlFor={`cat-${category}`}
                                            className={cn(
                                                "font-normal text-sm",
                                                !isChecked && limitReached && "text-muted-foreground opacity-50"
                                            )}
                                        >
                                            {category}
                                        </Label>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label>Target Gender</Label>
                        <RadioGroup value={targetGender} onValueChange={setTargetGender} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="gender-all" />
                                <Label htmlFor="gender-all" className="font-normal">All Genders</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="gender-male" />
                                <Label htmlFor="gender-male" className="font-normal">Male</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="gender-female" />
                                <Label htmlFor="gender-female" className="font-normal">Female</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Target Age Ranges</Label>
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="link" className="text-xs p-0 h-auto">See Disclaimer</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Advertising Disclaimer</DialogTitle>
                                        <DialogDescription>Age-Appropriate Content Responsibility</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4 text-sm">
                                        <p>You are solely responsible for ensuring your advertisement is appropriate for the age ranges you select. All advertising must comply with applicable laws and regulations regarding marketing to different age groups.</p>
                                        <p>Misleading or inappropriate targeting may result in the removal of your campaign and a review of your account.</p>
                                        <Button asChild variant="outline">
                                            <Link href="https://www.gov.uk/guidance/child-online-safety-age-appropriate-content" target="_blank">
                                                Read UK Government Guidance
                                            </Link>
                                        </Button>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button>I Understand</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                             {ageRanges.map(range => (
                                <div key={range} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`age-${range}`} 
                                        checked={targetAgeRanges.includes(range)}
                                        onCheckedChange={() => handleAgeRangeChange(range)}
                                    />
                                    <Label 
                                        htmlFor={`age-${range}`}
                                        className="font-normal text-sm"
                                    >
                                        {range}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>


                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Approval Process</AlertTitle>
                        <AlertDescription>
                           Once submitted, your advert will be sent to the Community Leader for your primary community for approval. You will be notified when it goes live.
                        </AlertDescription>
                    </Alert>
                 </CardContent>
                 <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button onClick={handleSubmit} disabled={!isReadyForSubmit || isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4" />
                        {advertCost > 0 ? `Pay & Submit for Approval` : 'Submit for Approval (Free)'}
                    </Button>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Advert Cost</p>
                        <p className="text-2xl font-bold">£{advertCost.toFixed(2)}</p>
                    </div>
                 </CardFooter>
            </Card>
        </div>
    )
}


const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
);

export default function TargetingAdvertPage() {
    return (
        <React.Suspense fallback={<SuspenseFallback />}>
            <TargetingAdvertPageContent />
        </React.Suspense>
    );
}


