"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Target, Info, ChevronDown, Loader2, Save, X, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveAdvertAsDraft } from "@/lib/actions/advertActions";
import { getPricingPlans, type AdvertiserPlan } from "@/lib/actions/pricingActions";
import { createCheckoutSession } from "@/lib/actions/stripeActions";
import { Badge } from "@/components/ui/badge";
import { doc, collection, query, where } from "firebase/firestore";
import { add } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
const MAX_COUNTRIES = 4;

type AdData = {
    id?: string;
    type: string;
    headline: string;
    shortDescription: string;
    fullDescription: string;
    websiteLink: string;
    emailAddress: string;
    image: string | null;
    targetCountries?: string[];
    targetCategories?: string[];
    targetGender?: string;
    targetAgeRanges?: string[];
    campaignDurationMonths?: number;
    startDate?: any;
    endDate?: any;
};

const TargetingAdvertPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const advertType = searchParams.get('type') || 'featured';
    const advertId = searchParams.get('id');

    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const [adData, setAdData] = React.useState<AdData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [pricingPlan, setPricingPlan] = React.useState<AdvertiserPlan | null>(null);
    
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
    const [selectedCountries, setSelectedCountries] = React.useState<string[]>([]);
    const [campaignDuration, setCampaignDuration] = React.useState<number>(1);
    const [dateRange, setDateRange] = React.useState<{ from: Date | undefined, to: Date | undefined }>({ from: undefined, to: undefined });
    const [targetGender, setTargetGender] = React.useState('all');
    const [targetAgeRanges, setTargetAgeRanges] = React.useState<string[]>([]);
    const [totalCost, setTotalCost] = React.useState(0);
    const [discountAmount, setDiscountAmount] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);
    const [isDirty, setIsDirty] = React.useState(false);

    const advertRef = useMemoFirebase(() => {
        if (!advertId || !db) return null;
        return doc(db, 'adverts', advertId as string);
    }, [advertId, db]);
    const { data: existingAdvertData, isLoading: advertLoading } = useDoc<AdData>(advertRef);

    const countriesQuery = useMemoFirebase(() => db ? query(collection(db, 'locations'), where('type', '==', 'country')) : null, [db]);
    const { data: countries, isLoading: countriesLoading } = useCollection<{id: string, name: string}>(countriesQuery);
    
    // Unsaved changes warning
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Unified loading and date initialization logic
    React.useEffect(() => {
        if (advertId && advertLoading) return;

        const storedDataString = sessionStorage.getItem('advertPreviewData');
        const storedData = storedDataString ? JSON.parse(storedDataString) : null;

        const source = existingAdvertData || storedData;

        if (source) {
            setAdData(source);
            setSelectedCategories(source.targetCategories || []);
            setTargetGender(source.targetGender || 'all');
            setTargetAgeRanges(source.targetAgeRanges || []);
            
            const dbDate = source.startDate?.toDate ? source.startDate.toDate() : (source.startDate ? new Date(source.startDate) : new Date());
            setCampaignDuration(source.campaignDurationMonths || 1);
            setDateRange({ from: dbDate, to: add(dbDate, { months: source.campaignDurationMonths || 1 }) });

            if (source.targetCountries && countries) {
                const countryIds = source.targetCountries
                    .map(name => countries.find(c => c.name === name)?.id)
                    .filter((id): id is string => !!id);
                setSelectedCountries(countryIds);
            }
        } else {
            const now = new Date();
            setDateRange({ from: now, to: add(now, { months: 1 }) });
        }
        
        setLoading(false);
    }, [existingAdvertData, advertLoading, countries, advertId]);

    React.useEffect(() => {
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.advertiser) {
                setPricingPlan(plans.advertiser);
            }
        };
        fetchPlans();
    }, []);

    React.useEffect(() => {
        const newEndDate = dateRange.from ? add(dateRange.from, { months: campaignDuration }) : undefined;
        setDateRange(prev => ({ ...prev, to: newEndDate }));
    }, [campaignDuration, dateRange.from]);

    React.useEffect(() => {
        if (!pricingPlan || !dateRange.from) {
            setTotalCost(0);
            setDiscountAmount(0);
            return;
        }

        const basePrice = advertType === 'featured' ? pricingPlan.featuredAdPrice : pricingPlan.partnerAdPrice;
        const numberOfCountries = selectedCountries.length;
        
        const billableCountries = numberOfCountries >= 4 ? 3 : numberOfCountries;
        const grossCost = basePrice * billableCountries * campaignDuration;
        
        let calculatedDiscount = 0;
        if (campaignDuration >= 12) {
            calculatedDiscount = basePrice * billableCountries;
        } else if (campaignDuration >= 6) {
            calculatedDiscount = grossCost * 0.10;
        }

        const finalCost = grossCost - calculatedDiscount;
        const countryDiscount = basePrice * (numberOfCountries - billableCountries) * campaignDuration;
        
        setTotalCost(finalCost);
        setDiscountAmount(calculatedDiscount + countryDiscount);

    }, [selectedCountries, campaignDuration, advertType, pricingPlan, dateRange.from]);

    const handleCategoryChange = (category: string) => {
        setSelectedCategories(prev => 
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
        setIsDirty(true);
    };
    
    const handleCountryChange = (countryId: string) => {
        setSelectedCountries(prev => {
            const isSelected = prev.includes(countryId);
            if (isSelected) {
                return prev.filter(id => id !== countryId);
            } else {
                if (prev.length < MAX_COUNTRIES) {
                    return [...prev, countryId];
                } else {
                    toast({
                        title: "Country Limit Reached",
                        description: `You can select a maximum of ${MAX_COUNTRIES} countries.`,
                        variant: "destructive"
                    });
                    return prev;
                }
            }
        });
        setIsDirty(true);
    };
    
    const handleAgeRangeChange = (ageRange: string) => {
        setTargetAgeRanges(prev => 
            prev.includes(ageRange)
                ? prev.filter(c => c !== ageRange)
                : [...prev, ageRange]
        );
        setIsDirty(true);
    };

    const getCampaignData = () => {
        if (!adData) return null;
        
        return {
            headline: adData.headline,
            shortDescription: adData.shortDescription,
            fullDescription: adData.fullDescription,
            websiteLink: adData.websiteLink || '',
            emailAddress: adData.emailAddress || '',
            image: adData.image,
            type: adData.type,
            id: advertId || undefined,
            title: adData.headline,
            ownerId: user?.uid,
            scope: 'national',
            targetCategories: selectedCategories,
            targetCountries: selectedCountries.map(id => countries?.find(country => country.id === id)?.name || ''),
            targetGender,
            targetAgeRanges,
            campaignDurationMonths: campaignDuration,
            startDate: dateRange.from ? dateRange.from.toISOString() : null,
            endDate: dateRange.to ? dateRange.to.toISOString() : null,
            totalCost: totalCost,
        };
    };

    const handleSubmit = async () => {
        if (!user || !userProfile || !adData) {
             toast({ title: "Error", description: "You must be logged in to submit a campaign.", variant: "destructive" });
             return;
        }

        setIsSubmitting(true);
        
        const campaignData = getCampaignData();
        if (!campaignData) return;

        const saveResult = await saveAdvertAsDraft({ 
            userId: user.uid, 
            advertData: campaignData 
        });

        if (!saveResult.success || !saveResult.id) {
            toast({ title: "Error", description: "Failed to prepare campaign for payment. " + saveResult.error, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        const activeAdvertId = saveResult.id;

        const checkoutParams: any = {
            uid: user.uid,
            email: user.email!,
            name: userProfile.name,
            mode: 'payment',
            price: totalCost,
            productName: `Campaign: ${adData.headline}`,
            quantity: 1,
            successUrlPath: '/national/adverts?payment=success',
            metadata: {
                userId: user.uid,
                advertId: activeAdvertId,
                purchaseType: 'national_advert_campaign',
            }
        };
        
        const sessionResult = await createCheckoutSession(checkoutParams);
        
        if (sessionResult.url) {
            setIsDirty(false);
            sessionStorage.removeItem('advertPreviewData');
            router.push(sessionResult.url);
        } else {
            toast({ title: "Error", description: sessionResult.error, variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        const campaignData = getCampaignData();
        if (!campaignData) return;

        setIsSavingDraft(true);
        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: campaignData });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your campaign targeting has been saved." });
            setIsDirty(false);
            sessionStorage.removeItem('advertPreviewData');
            router.push("/national/adverts");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };

    const isReadyForSubmit = 
        selectedCountries.length > 0 &&
        dateRange.from &&
        targetAgeRanges.length > 0 &&
        selectedCategories.length > 0;
    
    const handleBack = () => {
        router.push(`/national/adverts/create/preview?type=${advertType}${advertId ? `&id=${advertId}` : ''}`);
    };
    
    if (loading || isUserLoading || isProfileLoading || countriesLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    if (!adData) {
        return (
             <div className="text-center py-12 space-y-4">
                <h1 className="text-2xl font-bold">Error: Advert Data Not Found</h1>
                <p className="text-muted-foreground">It seems the data from the previous step was lost. Please go back.</p>
                <Button variant="link" onClick={handleBack}>
                    Go Back to Preview
                </Button>
             </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-16">
             <div>
                <Button variant="ghost" className="mb-4" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Preview
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                   <Target className="h-8 w-8 text-primary" />
                   Campaign Targeting & Submission (Step 4 of 4)
                </h1>
                <p className="text-muted-foreground mt-2">
                   Select the audience categories and geographic territories you want to target with this campaign.
                </p>
            </div>
            
            <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle>Performance-Based Pricing</AlertTitle>
                <AlertDescription>
                    Your campaign remains active for the entire duration selected. Discounts apply for multi-country targeting and long-term commitments.
                </AlertDescription>
            </Alert>

            <Card className="border-2 shadow-sm">
                <CardHeader>
                    <CardTitle>Define Your Campaign Parameters</CardTitle>
                    <CardDescription>Select the countries, duration, and audience for your ad campaign.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6 items-start">
                        <div className="grid gap-2 md:col-span-1">
                            <div className="flex items-center gap-1.5">
                                <Label htmlFor="country-select">Target Countries</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="p-2 text-sm max-w-xs space-y-1">
                                                <h4 className="font-semibold">Multi-Country Discount</h4>
                                                <p>&bull; Select 3 countries and get the 4th one free!</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between">
                                        <span>Select Countries ({selectedCountries.length} selected)</span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                     <ScrollArea className="h-72">
                                        {countries?.sort((a,b) => a.name.localeCompare(b.name)).map(country => (
                                            <DropdownMenuCheckboxItem
                                                key={country.id}
                                                checked={selectedCountries.includes(country.id)}
                                                onCheckedChange={() => handleCountryChange(country.id)}
                                                onSelect={(e) => e.preventDefault()}
                                                disabled={selectedCountries.length >= MAX_COUNTRIES && !selectedCountries.includes(country.id)}
                                            >
                                                {country.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </ScrollArea>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {selectedCountries.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50 min-h-10">
                                    {selectedCountries.map(id => {
                                        const country = countries?.find(c => c.id === id);
                                        return (
                                             <Badge key={id} variant="secondary" className="flex items-center gap-1.5">
                                                {country?.name}
                                                <button onClick={() => handleCountryChange(id)} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 md:col-span-1">
                             <div className="grid gap-2">
                                <Label htmlFor="start-date">Campaign Start Date</Label>
                                <DatePicker date={dateRange.from || undefined} setDate={(date) => { setDateRange(prev => ({...prev, from: date})); setIsDirty(true); }} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="campaign-duration">Duration</Label>
                                <Select onValueChange={(value) => { setCampaignDuration(Number(value)); setIsDirty(true); }} value={String(campaignDuration)}>
                                    <SelectTrigger id="campaign-duration">
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 3, 6, 12].map(month => (
                                            <SelectItem key={month} value={String(month)}>
                                                {month} Month{month > 1 ? 's' : ''} {month >= 6 ? (month === 12 ? '(1 mo Free)' : '(10% off)') : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                     
                    <Separator />
                    
                    <div className="space-y-3">
                        <Label>Target Gender</Label>
                        <RadioGroup value={targetGender} onValueChange={(v) => { setTargetGender(v); setIsDirty(true); }} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="gender-all" />
                                <Label htmlFor="gender-all" className="font-normal cursor-pointer">All Genders</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="gender-male" />
                                <Label htmlFor="gender-male" className="font-normal cursor-pointer">Male</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="gender-female" />
                                <Label htmlFor="gender-female" className="font-normal cursor-pointer">Female</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>Target Age Ranges</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                            {ageRanges.map(range => (
                                <div key={range} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`age-${range}`} 
                                        checked={targetAgeRanges.includes(range)}
                                        onCheckedChange={() => handleAgeRangeChange(range)}
                                    />
                                    <Label htmlFor={`age-${range}`} className="font-normal text-sm cursor-pointer">{range}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <Label>Target Categories</Label>
                                <p className="text-sm text-muted-foreground">Choose interests matching your audience. (Max {MAX_CATEGORIES})</p>
                            </div>
                            <div className={cn("text-sm font-medium", selectedCategories.length > MAX_CATEGORIES ? "text-destructive" : "text-muted-foreground")}>
                                {selectedCategories.length} / {MAX_CATEGORIES}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t">
                            {adCategories.map(category => (
                                <div key={category} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`cat-${category}`} 
                                        checked={selectedCategories.includes(category)}
                                        onCheckedChange={() => handleCategoryChange(category)}
                                        disabled={selectedCategories.length >= MAX_CATEGORIES && !selectedCategories.includes(category)}
                                    />
                                    <Label htmlFor={`cat-${category}`} className="font-normal text-sm cursor-pointer">{category}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                 </CardContent>
                 <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-muted/10 border-t">
                     <div className="flex flex-wrap gap-2">
                        <Button onClick={handleSubmit} disabled={!isReadyForSubmit || isSubmitting} className="shadow-lg">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 h-4 w-4" />
                            Proceed to Stripe Payment
                        </Button>
                        <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
                            {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save as Draft
                        </Button>
                    </div>
                     <div className="text-right space-y-1">
                        {discountAmount > 0 && <div className="text-sm font-semibold text-emerald-600">Saving £{discountAmount.toFixed(2)}!</div>}
                        <p className="text-2xl font-bold">Total: £{totalCost.toFixed(2)}</p>
                    </div>
                 </CardFooter>
            </Card>
        </div>
    );
};

export default function TargetingAdvertPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TargetingAdvertPageContent />
        </React.Suspense>
    );
}
