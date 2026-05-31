

'use client';

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
import { uploadImageAction } from "@/lib/actions/storageActions";
import { Badge } from "@/components/ui/badge";
import { doc, collection, query, where, getDocs, limit, getDoc, documentId } from "firebase/firestore";
import { add, format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { LegalDocumentDisplay } from "@/components/legal-document-display";


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
const MAX_PARTNER_REGIONS = 5;


type AdData = {
    id?: string;
    type: string;
    headline: string;
    shortDescription: string;
    fullDescription: string;
    description: string; // for compatibility
    primaryLinkType: string;
    websiteLink: string;
    emailAddress: string;
    image: string | null;
    imagePath?: string;
    targetCountryIds?: string[];
    targetStateIds?: string[];
    targetRegionIds?: string[];
    targetCategories?: string[];
    targetGender?: string;
    targetAgeRanges?: string[];
    campaignDurationMonths?: number;
    startDate?: { toDate: () => Date } | string;
    endDate?: { toDate: () => Date } | string;
    businessId: string;
    businessName: string;
    isFamilyFriendly: boolean;
    metaTitle?: string;
    metaDescription?: string;
    videoUrl?: string;
    scope?: string;
    price?: string;
    createdAt?: any;
    updatedAt?: any;
};

type Location = {
  id: string;
  name: string;
  parent?: string;
}

const PricingBreakdown = ({ advertType, pricingPlan, campaignDuration, selectedCountries, selectedRegions, totalCost, discountAmount }: {
    advertType: string;
    pricingPlan: AdvertiserPlan | null;
    campaignDuration: number;
    selectedCountries: string[];
    selectedRegions: string[];
    totalCost: number;
    discountAmount: number;
}) => {
  if (!pricingPlan) return null;
  const basePrice = advertType === 'featured' ? pricingPlan.featuredAdPrice : pricingPlan.partnerAdPrice;

  if (advertType === 'partner') {
    const numberOfRegions = selectedRegions.length;
    if (numberOfRegions === 0) return null;
    
    const regionalDiscountAmount = [0, 0, 5, 10, 15, 20][numberOfRegions > 5 ? 5 : numberOfRegions] || 0;
    const monthlyBeforeDiscount = basePrice * numberOfRegions;
    const monthlyAfterRegionalDiscount = monthlyBeforeDiscount - regionalDiscountAmount;
    
    return (
      <div className="text-sm space-y-1 text-muted-foreground text-right">
        <p>{numberOfRegions} region(s) x £{basePrice.toFixed(2)} = £{monthlyBeforeDiscount.toFixed(2)}/mo</p>
        {regionalDiscountAmount > 0 && <p className="text-green-600">- £{regionalDiscountAmount.toFixed(2)} regional discount</p>}
        <p>= £{monthlyAfterRegionalDiscount.toFixed(2)}/mo x {campaignDuration} month(s)</p>
        {discountAmount - (regionalDiscountAmount * campaignDuration) > 0.01 && <p className="text-green-600">- £{(discountAmount - (regionalDiscountAmount * campaignDuration)).toFixed(2)} duration discount</p>}
      </div>
    );
  }

  return null;
}


const TargetingAdvertPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const advertType = searchParams.get("type") || 'local';
    const advertId = searchParams.get("id");

    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const [adData, setAdData] = React.useState<AdData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [pricingPlan, setPricingPlan] = React.useState<AdvertiserPlan | null>(null);
    const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
    
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
    
    // UI state for dropdowns
    const [selectedCountries, setSelectedCountries] = React.useState<string[]>([]);
    const [selectedCountry, setSelectedCountry] = React.useState<string>("");
    const [selectedState, setSelectedState] = React.useState<string>("");
    const [selectedRegions, setSelectedRegions] = React.useState<string[]>([]);

    const [campaignDuration, setCampaignDuration] = React.useState<number>(1);
    const [dateRange, setDateRange] = React.useState<{ from: Date | undefined, to: Date | undefined }>({ from: new Date(), to: add(new Date(), { months: 1 }) });
    const [targetGender, setTargetGender] = React.useState('all');
    const [targetAgeRanges, setTargetAgeRanges] = React.useState<string[]>([]);
    const [totalCost, setTotalCost] = React.useState(0);
    const [discountAmount, setDiscountAmount] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);
    const [isResolvingLocation, setIsResolvingLocation] = React.useState(false);
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);

    const advertRef = useMemoFirebase(() => {
        if (!advertId || !db) return null;
        return doc(db, 'adverts', advertId as string);
    }, [advertId, db]);
    const { data: existingAdvertData, isLoading: advertLoading } = useDoc<AdData>(advertRef);

    const countriesQuery = useMemoFirebase(() => db ? query(collection(db, 'locations'), where('type', '==', 'country')) : null, [db]);
    const { data: countries, isLoading: countriesLoading } = useCollection<Location>(countriesQuery);
    
    const statesQuery = useMemoFirebase(() => db && selectedCountry ? query(collection(db, 'locations'), where('type', '==', 'state'), where('parent', '==', selectedCountry)) : null, [db, selectedCountry]);
    const { data: states, isLoading: statesLoading } = useCollection<Location>(statesQuery);

    const regionsQuery = useMemoFirebase(() => db && selectedState ? query(collection(db, 'locations'), where('type', '==', 'region'), where('parent', '==', selectedState)) : null, [db, selectedState]);
    const { data: regions, isLoading: regionsLoading } = useCollection<Location>(regionsQuery);
    
    const localAdvertsQuery = useMemoFirebase(() => {
        if (!user || !db) return null;
        return query(collection(db, 'adverts'), where('ownerId', '==', user.uid), where('scope', '==', 'community'));
    }, [user, db]);
    const { data: localAdvertsData } = useCollection(localAdvertsQuery);
    const localAdvertCount = localAdvertsData?.length || 0;


    React.useEffect(() => {
        const storedData = sessionStorage.getItem('advertPreviewData');
        if (storedData) {
            setAdData(JSON.parse(storedData));
        } else if (existingAdvertData) {
            setAdData(existingAdvertData);
        }
        
        if(!advertLoading) {
            setLoading(false);
        }
    }, [existingAdvertData, advertLoading]);

    const toDate = (date: any): Date | undefined => {
      if (!date) return undefined;
      if (date.toDate) return date.toDate();
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
    };
    
   React.useEffect(() => {
    if (!adData || !db || isResolvingLocation || countriesLoading) return;
    
    const resolveAndSetSelections = async () => {
      setIsResolvingLocation(true);
      try {
        const hasLoadedFromStorage = !!sessionStorage.getItem('advertPreviewData');
        const dataSource = hasLoadedFromStorage ? adData : existingAdvertData || adData;
        if(!dataSource) {
           setIsResolvingLocation(false);
           return;
        }

        if (advertType === 'partner' && dataSource.targetRegionIds && dataSource.targetRegionIds.length > 0) {
          const regionIds = dataSource.targetRegionIds;
          setSelectedRegions(regionIds);

          if (regionIds.length > 0) {
            const firstRegionId = regionIds[0];
            const regionSnapshot = await getDocs(query(collection(db, "locations"), where(documentId(), "==", firstRegionId)));
            if (!regionSnapshot.empty) {
                const stateId = regionSnapshot.docs[0].data().parent;
                if (stateId) {
                    const stateDoc = await getDoc(doc(db, 'locations', stateId));
                    if (stateDoc.exists()) {
                        const countryId = stateDoc.data().parent;
                        if(countryId) setSelectedCountry(countryId);
                        setTimeout(() => {
                            setSelectedState(stateId);
                        }, 100);
                    }
                }
            }
          }
        } 
        else if (advertType === 'featured' && dataSource.targetCountryIds && dataSource.targetCountryIds.length > 0) {
          setSelectedCountries(dataSource.targetCountryIds);
        }

        setSelectedCategories(dataSource.targetCategories || []);
        setTargetGender(dataSource.targetGender || 'all');
        setTargetAgeRanges(dataSource.targetAgeRanges || []);
        setCampaignDuration(dataSource.campaignDurationMonths || 1);
        
        const startDate = toDate(dataSource.startDate);
        const endDate = toDate(dataSource.endDate);
        if(startDate) {
            setDateRange({ from: startDate, to: endDate });
        }
      } catch (error) {
        console.error("Error resolving saved locations:", error);
      } finally {
        setIsResolvingLocation(false);
      }
    };

    resolveAndSetSelections();
}, [adData, existingAdvertData, db, advertType, countriesLoading]);



    React.useEffect(() => {
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            setPricingPlan(plans.advertiser);
            setEnterprisePlan(plans.enterprise);
        };
        fetchPlans();
    }, []);

    React.useEffect(() => {
        if (advertType === 'local') return;
        const newEndDate = dateRange.from ? add(dateRange.from, { months: campaignDuration }) : undefined;
        setDateRange(prev => ({ ...prev, to: newEndDate }));
    }, [campaignDuration, dateRange.from, advertType]);


    React.useEffect(() => {
        if (!pricingPlan || !dateRange.from) {
            setTotalCost(0);
            setDiscountAmount(0);
            return;
        }

        if (advertType === 'local') {
            const freeSlots = enterprisePlan?.adverts ?? 10;
            const additionalCost = enterprisePlan?.additionalAdvertPrice ?? 10;
            const cost = localAdvertCount >= freeSlots ? additionalCost : 0;
            setTotalCost(cost);
            setDiscountAmount(0);
        } else if (advertType === 'partner') {
            const basePrice = pricingPlan.partnerAdPrice;
            const numberOfRegions = selectedRegions.length;
            
            if (numberOfRegions === 0) {
                setTotalCost(0);
                setDiscountAmount(0);
                return;
            }

            let regionalDiscount = 0;
            if (numberOfRegions === 2) regionalDiscount = 5;
            else if (numberOfRegions === 3) regionalDiscount = 10;
            else if (numberOfRegions === 4) regionalDiscount = 15;
            else if (numberOfRegions >= 5) regionalDiscount = 20;

            const monthlyCost = (basePrice * numberOfRegions) - regionalDiscount;
            const grossTotal = monthlyCost * campaignDuration;

            let durationDiscount = 0;
            if (campaignDuration >= 12) {
                durationDiscount = monthlyCost * 1; // 1 month free
            } else if (campaignDuration >= 6) {
                durationDiscount = grossTotal * 0.10; // 10% off
            }

            const finalCost = grossTotal - durationDiscount;
            
            setTotalCost(finalCost);
            setDiscountAmount((basePrice * numberOfRegions * campaignDuration) - finalCost);

        } else { // 'featured' logic
            const basePrice = pricingPlan.featuredAdPrice;
            const numberOfTargets = selectedCountries.length;

            const billableTargets = Math.min(numberOfTargets, 3);
            
            const grossCost = basePrice * numberOfTargets * campaignDuration;
            
            const costBeforeDurationDiscount = basePrice * billableTargets * campaignDuration;

            let durationDiscount = 0;
            if (campaignDuration >= 12) {
                durationDiscount = basePrice * billableTargets * 1; // 1 month free on the billable part
            } else if (campaignDuration >= 6) {
                durationDiscount = costBeforeDurationDiscount * 0.10; // 10% off the billable part
            }
            
            const finalCost = costBeforeDurationDiscount - durationDiscount;
            setTotalCost(finalCost);
            setDiscountAmount(grossCost - finalCost);
        }
    }, [selectedCountries, selectedRegions, campaignDuration, advertType, pricingPlan, enterprisePlan, dateRange.from, localAdvertCount]);

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

    const handlePartnerCountryChange = (countryId: string) => {
        setSelectedCountry(countryId);
        setSelectedState("");
        setSelectedRegions([]);
    };

    const handlePartnerStateChange = (stateId: string) => {
        setSelectedState(stateId);
        setSelectedRegions([]);
    };

    const handleRegionChange = (regionId: string) => {
        setSelectedRegions(prev => {
            const isSelected = prev.includes(regionId);
            if (isSelected) {
                return prev.filter(id => id !== regionId);
            } else {
                if (prev.length >= MAX_PARTNER_REGIONS) {
                    toast({
                        title: "Region Limit Reached",
                        description: `You can select a maximum of ${MAX_PARTNER_REGIONS} regions.`,
                        variant: "destructive"
                    });
                    return prev;
                }
                return [...prev, regionId];
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
    
    const getCampaignData = () => {
        if (!adData) return null;
        
        const targetingData: any = {
            targetCategories: selectedCategories,
            targetGender: targetGender,
            targetAgeRanges: targetAgeRanges,
        };
        
        if (advertType === 'partner') {
            targetingData.targetRegionIds = selectedRegions;
            targetingData.targetCountryIds = []; 
            targetingData.targetStateIds = []; 
        } else if (advertType === 'featured') {
            targetingData.targetCountryIds = selectedCountries;
            targetingData.targetRegionIds = [];
            targetingData.targetStateIds = [];
        } else { // local
             targetingData.targetRegionIds = [];
             targetingData.targetCountryIds = [];
             targetingData.targetStateIds = [];
        }
        
        const cleanData: any = {
            ...adData,
            ...targetingData,
            campaignDurationMonths: campaignDuration,
            startDate: dateRange.from?.toISOString(),
            endDate: dateRange.to?.toISOString(),
        };

        return cleanData;
    };


    const handleSubmit = async () => {
        if (!user || !userProfile || !adData) {
             toast({ title: "Error", description: "You must be logged in to submit a campaign.", variant: "destructive" });
             return;
        }

        setIsSubmitting(true);
        const campaignData = getCampaignData();

        if (!campaignData) {
            toast({ title: "Error", description: "Could not retrieve campaign data.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        
        try {
            // IF FREE
            if (totalCost <= 0) {
                const result = await submitAdvertForApprovalAction({
                    userId: user.uid,
                    advertData: campaignData,
                    isLocalFree: true,
                });
                if (result.success) {
                    toast({ title: 'Campaign Submitted!', description: 'Your free campaign is now pending approval.' });
                    sessionStorage.removeItem('advertPreviewData');
                    router.push('/enterprise/adverts');
                } else {
                    throw new Error(result.error);
                }
            } else { // IF NEEDS PAYMENT
                const checkoutParams: any = {
                    uid: user.uid,
                    email: user.email!,
                    name: userProfile.name,
                    mode: 'payment',
                    price: totalCost,
                    productName: `National Ad Campaign: ${campaignData?.title}`,
                    successUrlPath: '/enterprise/adverts?payment=success',
                    purchaseType: 'national_advert_campaign',
                    metadata: {
                        ...(advertId && { advertId }),
                        isUpdate: !!advertId,
                        campaignData: JSON.stringify(campaignData),
                    }
                };
                
                const sessionResult = await createCheckoutSession(checkoutParams);
                if (sessionResult.url) {
                    router.push(sessionResult.url);
                } else {
                    throw new Error(sessionResult.error || "Could not initiate payment process.");
                }
            }
        } catch(error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
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
        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: campaignData });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your campaign progress has been saved." });
             sessionStorage.removeItem('advertPreviewData');
            router.push("/enterprise/adverts");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };
    
    const selectedCountryName = countries?.find(c => c.id === selectedCountry)?.name;
    const selectedStateName = states?.find(s => s.id === selectedState)?.name;
    const selectedRegionNames = selectedRegions.map(id => regions?.find(r => r.id === id)?.name).filter(Boolean) as string[];
    const selectedCountryNames = selectedCountries.map(id => countries?.find(c => c.id === id)?.name).filter(Boolean) as string[];

    const limitReached = selectedCategories.length >= MAX_CATEGORIES;
    
    const isReadyForSubmit = advertType === 'local'
      ? selectedCategories.length > 0 && agreedToTerms
      : advertType === 'partner'
      ? selectedCountry && selectedState && selectedRegions.length > 0 && selectedCategories.length > 0 && agreedToTerms
      : selectedCountries.length > 0 && selectedCategories.length > 0 && dateRange.from && agreedToTerms;
    
    const handleBack = () => {
        let backUrl = `/enterprise/adverts/create/preview?type=${advertType || 'local'}`;
        if (advertId) backUrl += `&id=${advertId}`;
        router.push(backUrl);
    }
    
    const isLoading = loading || isUserLoading || isProfileLoading || countriesLoading || isResolvingLocation;

    if (isLoading) {
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
                   Review & Submit (Step 3 of 4)
                </h1>
                <p className="text-muted-foreground mt-2">
                   Confirm your advert details and submit it for approval.
                </p>
            </div>
            
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>A Different Approach to Advertising</AlertTitle>
                <AlertDescription>
                    Unlike pay-per-click models, our pricing is based on duration, not clicks. Your campaign remains active for the entire period you select—whether it receives one click or one million—ensuring consistent visibility for your brand without unpredictable costs.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Define Your Campaign</CardTitle>
                    <CardDescription>Select the location, duration, and audience for your ad campaign.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                     {advertType === 'local' ? (
                        <div className="space-y-2">
                            <Label>Target Community</Label>
                            <Alert>
                                <AlertTitle>Local Campaign</AlertTitle>
                                <AlertDescription>
                                    This advert will be displayed exclusively in your primary community: <strong>{userProfile?.communityName || '...'}</strong>. The start and end dates are taken from the previous step. No further location or date targeting is needed.
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : advertType === 'partner' ? (
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-6 items-start">
                                <div className="grid gap-2">
                                    <Label htmlFor="country-select">Target Country *</Label>
                                    <Select onValueChange={handlePartnerCountryChange} value={selectedCountry}>
                                        <SelectTrigger><SelectValue placeholder="Select a country..." /></SelectTrigger>
                                        <SelectContent>
                                            {countries?.sort((a,b) => a.name.localeCompare(b.name)).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="state-select">Target State/Constituent *</Label>
                                    <Select onValueChange={handlePartnerStateChange} value={selectedState} disabled={!selectedCountry || statesLoading}>
                                        <SelectTrigger><SelectValue placeholder={statesLoading ? "Loading..." : "Select a state..."} /></SelectTrigger>
                                        <SelectContent>
                                            {states?.sort((a,b) => a.name.localeCompare(b.name)).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Label htmlFor="region-select">Target Regions (Max {MAX_PARTNER_REGIONS}) *</Label>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5">
                                                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="p-2 text-sm max-w-xs space-y-1">
                                                    <h4 className="font-semibold">Multi-Region Discount</h4>
                                                    <p>&bull; 2 regions: £5 off total monthly cost.</p>
                                                    <p>&bull; 3 regions: £10 off total monthly cost.</p>
                                                    <p>&bull; 4 regions: £15 off total monthly cost.</p>
                                                    <p>&bull; 5 regions: £20 off total monthly cost.</p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between" disabled={!selectedState || regionsLoading}>
                                            <span>{regionsLoading ? "Loading..." : `Select Regions (${selectedRegions.length})`}</span>
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                        <ScrollArea className="h-72">
                                            {regions?.sort((a,b) => a.name.localeCompare(b.name)).map(region => (
                                                <DropdownMenuCheckboxItem key={region.id} 
                                                    checked={selectedRegions.includes(region.id)} 
                                                    onCheckedChange={() => handleRegionChange(region.id)} 
                                                    onSelect={(e) => e.preventDefault()}
                                                    disabled={selectedRegions.length >= MAX_PARTNER_REGIONS && !selectedRegions.includes(region.id)}
                                                >
                                                    {region.name}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </ScrollArea>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {selectedRegions.length > 0 && (
                                    <div className="p-3 border rounded-md mt-2 space-y-2">
                                        <Label className="text-xs font-semibold">Selected Regions:</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {regions?.filter(region => selectedRegions.includes(region.id)).map(region => (
                                                <Badge key={region.id} variant="secondary" className="flex items-center gap-1.5">
                                                    {region.name}
                                                    <button type="button" onClick={() => handleRegionChange(region.id)} className="rounded-full hover:bg-muted-foreground/20" aria-label={`Remove ${region.name}`}>
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : ( // 'featured' advert
                        <div className="grid gap-2">
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
                        </div>
                    )}
                    
                    {advertType !== 'local' && (
                        <div className="grid md:grid-cols-2 gap-4 items-end">
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
                                                <Button variant="ghost" size="icon" className="h-5 w-5">
                                                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="p-2 text-sm max-w-xs space-y-2">
                                                    <div>
                                                        <h4 className="font-semibold">Campaign Duration Discounts</h4>
                                                        <p>&bull; <strong>6-11 months:</strong> 10% discount on total price.</p>
                                                        <p>&bull; <strong>12 months:</strong> Pay for 11 months (one month free).</p>
                                                    </div>
                                                    {advertType === 'partner' && (
                                                        <div>
                                                            <h4 className="font-semibold mt-2 pt-2 border-t">Multi-Region Discount (Partner Ads)</h4>
                                                            <p>&bull; 2 regions: £5 off total monthly cost.</p>
                                                            <p>&bull; 3 regions: £10 off total monthly cost.</p>
                                                            <p>&bull; 4 regions: £15 off total monthly cost.</p>
                                                            <p>&bull; 5 regions: £20 off total monthly cost.</p>
                                                        </div>
                                                    )}
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
                    )}
                     
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
                            <div>
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
                 <CardFooter className="flex-col items-stretch gap-4">
                     <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} />
                        <Label htmlFor="terms" className="text-sm font-normal">
                            I have read and agree to the{' '}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <span className="underline text-primary cursor-pointer">Advertising Terms & Conditions</span>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                                    <DialogHeader className="p-6 pb-2 border-b">
                                        <DialogTitle>Advertising Terms & Conditions</DialogTitle>
                                    </DialogHeader>
                                    <ScrollArea className="h-full">
                                        <div className="p-6">
                                            <LegalDocumentDisplay documentId="uGovZWsNy04OqEDKkV1D" />
                                        </div>
                                    </ScrollArea>
                                    <DialogFooter className="p-6 pt-4 border-t">
                                        <DialogClose asChild><Button type="button">Close</Button></DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            .
                        </Label>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-2">
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleSubmit} disabled={!isReadyForSubmit || selectedCategories.length > MAX_CATEGORIES || isSubmitting || !agreedToTerms}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Send className="mr-2 h-4 w-4" />
                                {advertType === 'local' ? 'Publish Campaign' : 'Pay & Publish'}
                            </Button>
                            <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
                                {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save as Draft
                            </Button>
                        </div>
                         <div className="text-right space-y-1">
                            {advertType !== 'local' && (
                                <PricingBreakdown
                                    advertType={advertType}
                                    pricingPlan={pricingPlan}
                                    campaignDuration={campaignDuration}
                                    selectedCountries={selectedCountries}
                                    selectedRegions={selectedRegions}
                                    totalCost={totalCost}
                                    discountAmount={discountAmount}
                                />
                            )}
                            {discountAmount > 0 && advertType !== 'local' && (
                                <div className="text-sm font-semibold text-green-600 flex items-center justify-end gap-1.5">
                                    <BadgePercent className="h-4 w-4" />
                                    You're saving £{discountAmount.toFixed(2)}!
                                </div>
                            )}
                             <p className="text-2xl font-bold">Total: £{totalCost.toFixed(2)}</p>
                        </div>
                    </div>
                    <Separator className="my-2" />
                     <div className="text-xs text-muted-foreground text-center sm:text-left">
                        {advertType === 'local' ? (
                           <p>
                                Your campaign will be displayed in your primary community: <strong>{userProfile?.communityName || '...'}</strong>. The cost for this campaign is <strong>£{totalCost.toFixed(2)}</strong>.
                            </p>
                        ) : advertType === 'partner' ? (
                           <p>
                                Your campaign will be displayed in <strong>{selectedRegionNames.length}</strong> region(s): <strong>{selectedRegionNames.join(', ') || 'None selected'}</strong>. Your account invoice for the total of <strong>£{totalCost.toFixed(2)}</strong> will be provided by Stripe, our payment partners, once you have completed the transaction.
                            </p>
                        ) : ( 
                            <p>
                                Your campaign will cover {selectedCountryNames.length} countr{selectedCountryNames.length === 1 ? 'y' : 'ies'}: <strong>{selectedCountryNames.join(', ') || 'None selected'}</strong>. The cost is calculated at £{pricingPlan?.featuredAdPrice?.toFixed(2)} per country (up to a maximum of 3). Your account invoice for the total of <strong>£{totalCost.toFixed(2)}</strong> will be provided by Stripe, our payment partners, once you have completed the transaction.
                            </p>
                        )}
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

    