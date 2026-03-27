


"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Target, Info, ChevronDown, Loader2, Save, BadgePercent, X, Calendar as CalendarIcon, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveAdvertAsDraft, submitAdvertForApprovalAction } from "@/lib/actions/advertActions";
import { getPricingPlans, type AdvertiserPlan } from "@/lib/actions/pricingActions";
import { createCheckoutSession } from "@/lib/actions/stripeActions";
import { Badge } from "@/components/ui/badge";
import { doc, collection, query, where } from "firebase/firestore";
import { add, format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
const MAX_COUNTRIES = 4;


type AdData = {
    id?: string;
    type: string;
    headline: string;
    shortDescription: string;
    fullDescription: string;
    primaryLinkType: string;
    websiteLink: string;
    emailAddress: string;
    image: string | null;
    targetCountries?: string[];
    targetCategories?: string[];
    targetGender?: string;
    targetAgeRanges?: string[];
    campaignDurationMonths?: number;
    startDate?: { toDate: () => Date };
    endDate?: { toDate: () => Date };
};

const TargetingAdvertPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const advertType = searchParams.get("type") || 'featured';
    const isOwnerAd = searchParams.get("owner") === 'true';
    const advertId = searchParams.get("id");

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
    const [dateRange, setDateRange] = React.useState<{ from: Date | undefined, to: Date | undefined }>({ from: new Date(), to: add(new Date(), { months: 1 }) });
    const [targetGender, setTargetGender] = React.useState('all');
    const [targetAgeRanges, setTargetAgeRanges] = React.useState<string[]>([]);
    const [totalCost, setTotalCost] = React.useState(0);
    const [discountAmount, setDiscountAmount] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);

    const advertRef = useMemoFirebase(() => {
        if (!advertId || !db) return null;
        return doc(db, 'adverts', advertId as string);
    }, [advertId, db]);
    const { data: existingAdvertData, isLoading: advertLoading } = useDoc<AdData>(advertRef);

    const countriesQuery = useMemoFirebase(() => db ? query(collection(db, 'locations'), where('type', '==', 'country')) : null, [db]);
    const { data: countries, isLoading: countriesLoading } = useCollection<{id: string, name: string}>(countriesQuery);
    
    React.useEffect(() => {
        const storedData = sessionStorage.getItem('advertPreviewData');
        if (storedData) {
            setAdData(JSON.parse(storedData));
        } else if (existingAdvertData) {
            setAdData(existingAdvertData);
        }
        
        if (existingAdvertData) {
            setSelectedCategories(existingAdvertData.targetCategories || []);
            setTargetGender(existingAdvertData.targetGender || 'all');
            setTargetAgeRanges(existingAdvertData.targetAgeRanges || []);
            const startDate = existingAdvertData.startDate?.toDate() || new Date();
            const endDate = existingAdvertData.endDate?.toDate() || add(startDate, { months: existingAdvertData.campaignDurationMonths || 1 });
            setDateRange({ from: startDate, to: endDate });
            setCampaignDuration(existingAdvertData.campaignDurationMonths || 1);
            if (existingAdvertData.targetCountries && countries) {
                const countryIds = existingAdvertData.targetCountries
                    .map(name => countries.find(c => c.name === name)?.id)
                    .filter((id): id is string => !!id);
                setSelectedCountries(countryIds);
            }
        }
        
        if(!advertLoading) {
            setLoading(false);
        }
    }, [existingAdvertData, advertLoading, countries]);

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
    
    const monthlyCost = totalCost > 0 && campaignDuration > 0 ? totalCost / campaignDuration : 0;

    const handleCategoryChange = (category: string) => {
        setSelectedCategories(prev => 
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    }
    
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
    }
    
    const handleAgeRangeChange = (ageRange: string) => {
        setTargetAgeRanges(prev => 
            prev.includes(ageRange)
                ? prev.filter(c => c !== ageRange)
                : [...prev, ageRange]
        );
    };

    const getCampaignData = () => {
        if (!adData) return null;
        return {
            ...adData,
            title: adData.headline,
            ownerId: user?.uid,
            scope: 'national',
            targetCategories: selectedCategories,
            targetCountries: selectedCountries.map(id => countries?.find(country => country.id === id)?.name),
            targetGender,
            targetAgeRanges,
            campaignDurationMonths: campaignDuration,
            startDate: dateRange.from,
            endDate: dateRange.to,
            totalCost: totalCost,
        };
    }

    const handleSubmit = async () => {
        if (!user || !userProfile || !adData) {
             toast({ title: "Error", description: "You must be logged in to submit a campaign.", variant: "destructive" });
             return;
        }

        setIsSubmitting(true);
        const campaignData = getCampaignData();

        const checkoutParams: any = {
            uid: user.uid,
            email: user.email!,
            name: userProfile.name,
            mode: 'payment',
            price: totalCost,
            quantity: 1,
            successUrlPath: '/enterprise/adverts?payment=success',
            metadata: {
                campaignData: JSON.stringify(campaignData),
                ...(advertId && { advertId }),
            }
        };
        
        const sessionResult = await createCheckoutSession(checkoutParams);
        
        if (sessionResult.url) {
            router.push(sessionResult.url);
        } else {
            toast({ title: "Error", description: sessionResult.error, variant: "destructive" });
            setIsSubmitting(false);
        }
    }
    
    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        const campaignData = getCampaignData();
        if (!campaignData) {
            toast({ title: "Error", description: "Advert data not found to save as draft.", variant: "destructive" });
            return;
        }

        setIsSavingDraft(true);
        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: { id: advertId, ...campaignData } });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your campaign progress has been saved." });
             sessionStorage.removeItem('advertPreviewData');
            router.push(isOwnerAd ? "/admin/owner-adverts" : "/enterprise/adverts");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };

    const limitReached = selectedCategories.length >= MAX_CATEGORIES;
    const isReadyForSubmit = 
        selectedCountries.length > 0 &&
        dateRange.from &&
        targetAgeRanges.length > 0 &&
        selectedCategories.length > 0;
    
    const handleBack = () => {
        let backUrl = `/enterprise/adverts/create/preview?type=${advertType}`;
        if (isOwnerAd) backUrl += '&owner=true';
        if (advertId) backUrl += `&id=${advertId}`;
        router.push(backUrl);
    }
    
    if (loading || isUserLoading || isProfileLoading || countriesLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    if (!adData) {
        return (
             <div className="text-center">
                <h1 className="text-2xl font-bold">Error: Advert Data Not Found</h1>
                <p className="text-muted-foreground">It seems the data from the previous step was lost. Please go back.</p>
                <Button variant="link" onClick={handleBack}>
                    Go Back to Preview
                </Button>
             </div>
        );
    }

    return (
        <div className="space-y-8">
             <div>
                <Button variant="ghost" className="mb-4" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Preview
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                   <Target className="h-8 w-8" />
                   Campaign Targeting & Submission (Step 4 of 4)
                </h1>
                <p className="text-muted-foreground mt-2">
                   Select the audience categories you want to target with this campaign.
                </p>
            </div>
            
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>A Different Approach to Advertising</AlertTitle>
                <AlertDescription>
                    Unlike pay-per-click models, our pricing is based on duration, not clicks. Your campaign remains active for the entire period you select—whether it receives one click or one million—ensuring consistent visibility for your brand without unpredictable costs.
                    {' '}Each at £{advertType === 'featured' ? pricingPlan?.featuredAdPrice.toFixed(2) : pricingPlan?.partnerAdPrice.toFixed(2)}.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Define Your Campaign</CardTitle>
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
                                                <p className="text-xs">(Maximum of 4 countries per campaign)</p>
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
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 md:col-span-1">
                             <div className="grid gap-2">
                                <Label htmlFor="start-date">Campaign Start Date</Label>
                                <DatePicker date={dateRange.from || undefined} setDate={(date) => setDateRange(prev => ({...prev, from: date}))} />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Label htmlFor="campaign-duration">Campaign Duration</Label>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="p-2 text-sm max-w-xs space-y-1">
                                                    <h4 className="font-semibold">Campaign Discounts</h4>
                                                    <p>&bull; <strong>6-11 months:</strong> 10% discount on total price.</p>
                                                    <p>&bull; <strong>12 months:</strong> Pay for 11 months (one month free).</p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <Select onValueChange={(value) => setCampaignDuration(Number(value))} value={String(campaignDuration)}>
                                    <SelectTrigger id="campaign-duration">
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                                            let label = `${month} Month${month > 1 ? 's' : ''}`;
                                            if (month >= 6 && month < 12) {
                                                label += ` (10% off)`;
                                            } else if (month === 12) {
                                                label += ` (1 month free)`;
                                            }
                                            return (
                                                <SelectItem key={month} value={String(month)}>
                                                    {label}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
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

                    <Separator />
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <Label>Target Categories</Label>
                                <p className="text-sm text-muted-foreground">Choose interests that match your intended audience. (Max {MAX_CATEGORIES})</p>
                            </div>
                            <div className={cn("text-sm font-medium", selectedCategories.length > MAX_CATEGORIES ? "text-destructive" : "text-muted-foreground")}>
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
                                            onCheckedChange={() => {
                                                if (limitReached && !isChecked) {
                                                    toast({
                                                        title: "Category Limit Reached",
                                                        description: `You can select a maximum of ${MAX_CATEGORIES} categories.`,
                                                        variant: "destructive"
                                                    });
                                                    return;
                                                }
                                                handleCategoryChange(category)
                                            }}
                                            disabled={limitReached && !isChecked}
                                        />
                                        <Label 
                                            htmlFor={`cat-${category}`}
                                            className={cn(
                                                "font-normal text-sm",
                                                (limitReached && !isChecked) && "text-muted-foreground opacity-50"
                                            )}
                                        >
                                            {category}
                                        </Label>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 </CardContent>
                 <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex flex-wrap gap-2">
                        <Button onClick={handleSubmit} disabled={!isReadyForSubmit || selectedCategories.length > MAX_CATEGORIES || isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 h-4 w-4" />
                            Proceed to Payment
                        </Button>
                        <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
                            {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save as Draft
                        </Button>
                    </div>
                     <div className="text-right space-y-1">
                        {discountAmount > 0 && (
                            <div className="text-sm font-semibold text-green-600 flex items-center justify-end gap-1.5">
                                <BadgePercent className="h-4 w-4" />
                                You're saving £{discountAmount.toFixed(2)}!
                            </div>
                        )}
                        <p className="text-2xl font-bold">Total: £{totalCost.toFixed(2)}
                             <span className="text-sm font-normal text-muted-foreground ml-2">(£{monthlyCost.toFixed(2)}/month)</span>
                        </p>
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

    
