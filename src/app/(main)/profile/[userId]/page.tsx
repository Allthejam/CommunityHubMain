
'use client';

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase, useAuth, useCollection } from "@/firebase";
import {
    ArrowLeft,
    Loader2,
    Mail,
    Home,
    User as UserIcon,
    Camera,
    Upload,
    Save,
    Heart,
    Briefcase,
    KeyRound,
    HelpCircle,
    Crown,
    ShieldAlert,
    Calendar as CalendarIcon,
    Trash2,
    ArrowRight,
    Building,
    LogOut,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { changeAccountTypeAction, resignAsPresidentAction, deleteUserAccountAction, updateUserCommunityAction, updateUserFavouriteCommunitiesAction } from "@/lib/actions/userActions";
import { saveLeaderProfile } from "@/lib/actions/leaderActions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isAfter, addDays, intervalToDuration } from "date-fns";
import { CommunitySelector, type CommunitySelection } from "@/components/community-selector";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LegalDocumentDisplay } from "@/components/legal-document-display";

type UserProfile = {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    title?: string;
    communityName?: string;
    communityId?: string;
    homeCommunityId?: string;
    status: 'active' | 'suspended';
    accountDeletionScheduledAt?: { toDate: () => Date } | null;
    avatar?: string;
    banner?: string;
    gender?: string;
    ageRange?: string;
    joined?: { toDate: () => Date };
    countryId?: string;
    country?: string;
    favouriteCommunities?: string[];
    communityRoles?: Record<string, { role: string; title: string }>;
};

type CommunityDetails = {
    id: string;
    name: string;
    region: string;
    state: string;
    status: 'active' | 'pending' | 'suspended'
};

type Business = {
    id: string;
    status: 'Pending Approval' | 'Approved' | 'Requires Amendment' | 'Declined' | 'Subscribed' | 'Draft' | 'Hidden';
    storefrontSubscription?: boolean;
};

const ageRanges = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const genders = ["Male", "Female", "Other", "Prefer not to say"];

const StatusBadge = ({ status }: { status: CommunityDetails['status'] }) => {
  const statusStyles: { [key in CommunityDetails['status']]: string } = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };
  return <Badge className={cn('capitalize', statusStyles[status])}>{status}</Badge>;
}

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { userId } = params;
    const { user } = useUser();
    const db = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => {
        if (!userId || !db) return null;
        return doc(db, 'users', userId as string);
    }, [userId, db]);

    const { data: userProfile, isLoading: loading, error: docError } = useDoc<UserProfile>(userRef);

    const [countryName, setCountryName] = React.useState<string>("");
    const [bannerImage, setBannerImage] = React.useState<string | null | undefined>(userProfile?.banner);
    const [avatarImage, setAvatarImage] = React.useState<string | null | undefined>(userProfile?.avatar);
    
    const bannerInputRef = React.useRef<HTMLInputElement>(null);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

    const [isSaving, setIsSaving] = React.useState(false);
    
    // State for personal info card
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [gender, setGender] = React.useState(userProfile?.gender || "");
    const [ageRange, setAgeRange] = React.useState(userProfile?.ageRange || "");
    const [isSavingInfo, setIsSavingInfo] = React.useState(false);
    const [isCommunityDialogOpen, setIsCommunityDialogOpen] = React.useState(false);
    const [communitySelection, setCommunitySelection] = React.useState<CommunitySelection | null>(null);
    const [isSwitching, setIsSwitching] = React.useState(false);
    
    const [isClosureDialogOpen, setIsClosureDialogOpen] = React.useState(false);
    const [closurePassword, setClosurePassword] = React.useState('');
    const [isClosingAccount, setIsClosingAccount] = React.useState(false);
    const [agreedToDeletionTerms, setAgreedToDeletionTerms] = React.useState(false);
    
    const [favouriteCommunitiesDetails, setFavouriteCommunitiesDetails] = React.useState<CommunityDetails[]>([]);
    const [loadingFavourites, setLoadingFavourites] = React.useState(true);

    const [leadershipHubs, setLeadershipHubs] = React.useState<CommunityDetails[]>([]);
    const [loadingHubs, setLoadingHubs] = React.useState(true);
    
    const [isAccountTypeDialogOpen, setIsAccountTypeDialogOpen] = React.useState(false);
    const [isSubmittingAccountChange, setIsSubmittingAccountChange] = React.useState(false);
    const [isResignDialogOpen, setIsResignDialogOpen] = React.useState(false);
    const [resignConfirmation, setResignConfirmation] = React.useState('');
    const [isResigning, setIsResigning] = React.useState(false);

    // Password change state
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
    const [isChangingPassword, setIsChangingPassword] = React.useState(false);


    const businessesQuery = useMemoFirebase(() => {
        if (!userId || !db) return null;
        return query(collection(db, 'businesses'), where('ownerId', '==', userId));
    }, [userId, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);

    const hasActiveSubscription = React.useMemo(() => {
        return businesses?.some(b => b.status === 'Subscribed' || b.storefrontSubscription === true);
    }, [businesses]);

    React.useEffect(() => {
      if (docError) {
        // If the user doc doesn't exist anymore after a deletion attempt.
        if (user) signOut(auth); // Log out the user on the client
        router.push('/');
      }
    }, [docError, auth, router, user]);

    React.useEffect(() => {
        if (userProfile) {
            setBannerImage(userProfile.banner);
            setAvatarImage(userProfile.avatar);
            setFirstName(userProfile.firstName || '');
            setLastName(userProfile.lastName || '');
            setGender(userProfile.gender || "");
            setAgeRange(userProfile.ageRange || "");

            // This logic handles both legacy `country` (as ID) and new `countryId` fields
            const countryIdentifier = userProfile.countryId || userProfile.country;
            if (countryIdentifier && db) {
                // Simple heuristic to check if it's an ID vs a name.
                // Firestore IDs are typically 20 chars long and don't contain spaces.
                const isPotentiallyId = countryIdentifier.length >= 20 && !countryIdentifier.includes(' ');
                
                if (isPotentiallyId) {
                    const countryRef = doc(db, 'locations', countryIdentifier);
                    getDoc(countryRef).then(docSnap => {
                        if (docSnap.exists()) {
                            setCountryName(docSnap.data().name);
                        } else {
                            setCountryName("Invalid Country ID");
                        }
                    }).catch(() => setCountryName("Error fetching country"));
                } else {
                    // If it doesn't look like an ID, assume it's the name.
                    setCountryName(userProfile.country || "N/A");
                }
            } else {
                setCountryName("N/A");
            }
            
            if (userProfile.favouriteCommunities && userProfile.favouriteCommunities.length > 0 && db) {
                const fetchFavourites = async () => {
                    setLoadingFavourites(true);
                    try {
                        const communitiesQuery = query(collection(db, 'communities'), where(documentId(), 'in', userProfile.favouriteCommunities));
                        const snapshot = await getDocs(communitiesQuery);
                        const communitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityDetails));
                        setFavouriteCommunitiesDetails(communitiesData);
                    } catch (error) {
                        console.error("Error fetching favourite communities:", error);
                    } finally {
                        setLoadingFavourites(false);
                    }
                }
                fetchFavourites();
            } else {
                setFavouriteCommunitiesDetails([]);
                setLoadingFavourites(false);
            }

            if (userProfile.communityRoles && Object.keys(userProfile.communityRoles).length > 0 && db) {
                const fetchHubs = async () => {
                    setLoadingHubs(true);
                    try {
                        const hubIds = Object.keys(userProfile.communityRoles!);
                        if (hubIds.length > 0) {
                            const hubsQuery = query(collection(db, 'communities'), where(documentId(), 'in', hubIds));
                            const snapshot = await getDocs(hubsQuery);
                            const hubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityDetails));
                            setLeadershipHubs(hubsData);
                        } else {
                            setLeadershipHubs([]);
                        }
                    } catch (error) {
                        console.error("Error fetching leadership hubs:", error);
                    } finally {
                        setLoadingHubs(false);
                    }
                };
                fetchHubs();
            } else {
                setLeadershipHubs([]);
                setLoadingHubs(false);
            }
        }
    }, [userProfile, db]);

    const isOwner = user?.uid === userId;
    const hasImageChanges = userProfile?.banner !== bannerImage || userProfile?.avatar !== avatarImage;
    const hasInfoChanges = userProfile?.firstName !== firstName || userProfile?.lastName !== lastName || userProfile?.gender !== gender || userProfile?.ageRange !== ageRange;
    
    const handleAccountTypeChange = async (newType: 'personal' | 'business') => {
        if (!user) return;
        setIsSubmittingAccountChange(true);
        const result = await changeAccountTypeAction({ userId: user.uid, newType });
        if (result.success) {
            toast({ title: "Account Type Changed", description: `Your account is now a ${newType} account.` });
            if (newType === 'business') {
                router.push('/business/businesses/create');
            }
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmittingAccountChange(false);
        setIsAccountTypeDialogOpen(false);
    };

    const handleResign = async () => {
        if (!user || !userProfile?.communityId || resignConfirmation !== 'RESIGN') {
            toast({ title: "Confirmation failed", description: "Please type RESIGN to confirm.", variant: "destructive" });
            return;
        }
        setIsResigning(true);
        const result = await resignAsPresidentAction({ userId: user.uid, communityId: userProfile.communityId });
        if (result.success) {
            toast({ title: "Resignation Successful", description: "You are no longer the community president." });
            window.location.reload();
        } else {
            toast({ title: "Resignation Failed", description: result.error, variant: "destructive" });
        }
        setIsResigning(false);
        setIsResignDialogOpen(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: 'banner' | 'avatar') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'banner') setBannerImage(reader.result as string);
                if (field === 'avatar') setAvatarImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSaveImages = async () => {
        if (!isOwner || !userId) return;
        setIsSaving(true);
        const result = await saveLeaderProfile({ 
            userId: userId as string,
            profileData: {
                avatar: avatarImage,
                banner: bannerImage,
            }
        });
        setIsSaving(false);
        if (result.success) {
            toast({ title: "Profile Updated", description: "Your images have been saved." });
        } else {
            toast({ title: "Error", description: "Could not save your changes.", variant: "destructive" });
        }
    };
    
    const handleSaveInformation = async () => {
        if (!isOwner || !userId) return;
        setIsSavingInfo(true);
        const fullName = `${firstName} ${lastName}`.trim();
        const result = await saveLeaderProfile({ 
            userId: userId as string,
            profileData: {
                leaderName: fullName,
                firstName,
                lastName,
                gender,
                ageRange,
            }
        });
        setIsSavingInfo(false);
        if (result.success) {
            toast({ title: "Personal Info Updated", description: "Your details have been saved." });
        } else {
            toast({ title: "Error", description: "Could not save your changes.", variant: "destructive" });
        }
    }
    
    const handleRemoveFromFavourites = async (communityId: string) => {
        if (!user) return;
        const result = await updateUserFavouriteCommunitiesAction({ userId: user.uid, communityId, isFavourited: true });
        if (result.success) {
            toast({ title: "Removed from Favourites" });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    }
    
    const handleSwitchToFavourite = async (communityId: string) => {
        if (!user) return;
        setIsSwitching(true);
        const result = await updateUserCommunityAction({ userId: user.uid, communityId });
        setIsSwitching(false);
        if (result.success) {
            toast({ title: "Community Switched!", description: `You are now viewing the ${result.communityName} hub.` });
            router.push('/home');
        } else {
            toast({ title: 'Switch Failed', description: result.error, variant: 'destructive' });
        }
    }

    const handleChangeCommunity = async () => {
        if (!communitySelection?.community || communitySelection.community === 'other' || !user) {
            toast({ title: 'No Community Selected', description: 'Please select a community to switch to.', variant: 'destructive' });
            return;
        }
        
        setIsSwitching(true);
        const result = await saveLeaderProfile({
            userId: user.uid,
            profileData: {
                homeCommunityId: communitySelection.community,
                communityId: communitySelection.community,
            }
        });
        setIsSwitching(false);
        
        if (result.success) {
            toast({ title: 'Home Community Changed!', description: `Your home community has been updated.` });
            setIsCommunityDialogOpen(false);
            window.location.reload(); 
        } else {
            toast({ title: 'Switch Failed', description: 'Could not switch communities.', variant: 'destructive' });
        }
    }

    const handleAccountClosure = async () => {
        if (!user || !user.email) return;

        if (!closurePassword) {
            toast({ title: "Error", description: "Password is required to confirm.", variant: "destructive" });
            return;
        }
        setIsClosingAccount(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, closurePassword);
            await reauthenticateWithCredential(user, credential);
            
            const result = await deleteUserAccountAction({ userId: user.uid });

            if (result.success) {
                toast({ title: "Account Deleted", description: "Your account has been permanently removed." });
                if (auth) {
                    await signOut(auth); // Sign out from the client
                }
                router.push('/'); // Redirect
            } else {
                throw new Error(result.error || "An unexpected error occurred during account deletion.");
            }

        } catch (error: any) {
            let message = "An error occurred during account deletion.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = "Incorrect password. Please try again.";
            } else if (error.code === 'auth/too-many-requests') {
                message = "Too many attempts. Please try again later.";
            } else {
                message = error.message;
            }
            toast({ title: "Action Failed", description: message, variant: "destructive" });
        } finally {
            setIsClosingAccount(false);
            setClosurePassword('');
            setIsClosureDialogOpen(false);
        }
    };

    const handleChangePassword = async () => {
        if (!user || !user.email) {
            toast({ title: "Error", description: "User not found or email is missing.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
            return;
        }
        if (newPassword.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
            return;
        }

        setIsChangingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            
            toast({ title: "Success", description: "Your password has been changed." });
            setIsPasswordDialogOpen(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error: any) {
            let message = "An error occurred.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = "Incorrect current password. Please try again.";
            } else if (error.code === 'auth/too-many-requests') {
                message = "Too many attempts. Please try again later.";
            }
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setIsChangingPassword(false);
        }
    };
    
    if (loading || businessesLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">User Not Found</h1>
                <p className="text-muted-foreground">This user profile could not be found.</p>
                <Button variant="link" className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
            </div>
        );
    }
    
    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('');
    }

    return (
        <div className="w-full">
            <div className="relative h-48 md:h-64 w-full bg-muted group">
                <Image 
                    src={bannerImage || "https://picsum.photos/seed/9/1600/400"} 
                    alt="Profile banner"
                    fill
                    className="object-cover"
                    data-ai-hint="abstract landscape"
                />
                 {isOwner && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="file" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} accept="image/*" className="hidden" />
                        <Button variant="secondary" size="sm" onClick={() => bannerInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Update Banner
                        </Button>
                    </div>
                 )}
            </div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative -mt-16 sm:-mt-24 flex flex-col items-center sm:items-start sm:flex-row sm:gap-8">
                    <div className="relative group">
                        <Avatar className="h-32 w-32 sm:h-48 sm:w-48 border-4 border-background">
                            <AvatarImage src={avatarImage || undefined} alt={userProfile.name} />
                            <AvatarFallback className="text-6xl">{getInitials(userProfile.name)}</AvatarFallback>
                        </Avatar>
                        {isOwner && (
                            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => avatarInputRef.current?.click()}>
                                    <Upload /> Upload
                                </Button>
                                 <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" className="hidden" />
                            </div>
                        )}
                    </div>
                    <div className="mt-4 sm:mt-24 w-full">
                        <div className="flex flex-col sm:flex-row justify-between items-center">
                            <div className="text-center sm:text-left">
                                <h1 className="text-3xl sm:text-4xl font-bold font-headline">{userProfile.name}</h1>
                                <p className="text-lg text-muted-foreground">{userProfile.title || userProfile.role}</p>
                            </div>
                            <div className="mt-4 sm:mt-0">
                                <Badge variant={userProfile.status === 'active' ? 'default' : 'destructive'} className="capitalize bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                    {userProfile.status}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
                 {isOwner && hasImageChanges && (
                    <div className="mt-4 flex justify-center sm:justify-end">
                        <Button onClick={handleSaveImages} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" /> Save Image Changes
                        </Button>
                    </div>
                 )}
                 <div className="mt-8">
                    <Separator />
                </div>
                <div className="py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                         <Card>
                             <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Update your personal details here.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!isOwner}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} disabled={!isOwner}/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={userProfile.email} disabled />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <Select value={gender} onValueChange={setGender} disabled={!isOwner}>
                                        <SelectTrigger id="gender"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>
                                            {genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="age-range">Age Range</Label>
                                    <Select value={ageRange} onValueChange={setAgeRange} disabled={!isOwner}>
                                        <SelectTrigger id="age-range"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>
                                            {ageRanges.map(ar => <SelectItem key={ar} value={ar}>{ar}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Type</Label>
                                    <Input value={userProfile.role || "N/A"} disabled className="capitalize"/>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Account Created</Label>
                                    <Input value={userProfile.joined ? format(userProfile.joined.toDate(), 'PPP') : "N/A"} disabled />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Country</Label>
                                    <Input value={countryName || 'Loading...'} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Home Community</Label>
                                    <Input value={userProfile.communityName || "N/A"} disabled />
                                </div>
                            </CardContent>
                             {isOwner && (
                                <CardFooter className="justify-between flex-wrap gap-2">
                                    <Button onClick={handleSaveInformation} disabled={!hasInfoChanges || isSavingInfo}>
                                        {isSavingInfo && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Save Information
                                    </Button>
                                     <div className="flex gap-2 flex-wrap">
                                        <Dialog open={isAccountTypeDialogOpen} onOpenChange={setIsAccountTypeDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline">Change Account Type</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Change Your Account Type</DialogTitle>
                                                    <DialogDescription>
                                                        Select an option below. Some changes may have significant effects.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4 space-y-4">
                                                    {(userProfile?.role === 'personal' || userProfile?.role === 'reporter') && (
                                                        <div className="space-y-2">
                                                            <Button className="w-full justify-start" onClick={() => handleAccountTypeChange('business')}>
                                                                <Briefcase className="mr-2 h-4 w-4" /> Upgrade to Business Account
                                                            </Button>
                                                            <p className="text-xs text-muted-foreground px-1">Create a business profile and start selling.</p>
                                                            <Button variant="outline" className="w-full justify-start" asChild>
                                                                <Link href="/leader/profile">
                                                                    <Crown className="mr-2 h-4 w-4" /> Apply for Community Leadership
                                                                </Link>
                                                            </Button>
                                                            <p className="text-xs text-muted-foreground px-1">Take charge of an unmanaged community.</p>
                                                        </div>
                                                    )}
                                                     {(userProfile as any)?.accountType === 'business' && (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="destructive" className="w-full justify-start">
                                                                    <UserIcon className="mr-2 h-4 w-4" /> Downgrade to Personal Account
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                <DialogTitle>Are you sure?</DialogTitle>
                                                                <DialogDescription>
                                                                    Downgrading to a personal account will disassociate you from your business listings. You will lose access to the business dashboard. This action can be reversed by upgrading again.
                                                                </DialogDescription>
                                                                </DialogHeader>
                                                                <DialogFooter>
                                                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                                    <Button variant="destructive" onClick={() => handleAccountTypeChange('personal')}>Confirm Downgrade</Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                    {userProfile?.role === 'president' && (
                                                        <>
                                                            <Dialog open={isResignDialogOpen} onOpenChange={setIsResignDialogOpen}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="destructive" className="w-full justify-start">
                                                                        <LogOut className="mr-2 h-4 w-4" /> Resign as Community President
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Confirm Resignation</DialogTitle>
                                                                        <DialogDescription>
                                                                            This is a major step and cannot be easily undone. If you are the only leader, your community will become leaderless and inactive. To confirm, type <strong>RESIGN</strong> below.
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="py-2">
                                                                        <Label htmlFor="resign-confirm">Type RESIGN to confirm</Label>
                                                                        <Input id="resign-confirm" value={resignConfirmation} onChange={(e) => setResignConfirmation(e.target.value)} />
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <DialogClose asChild>
                                                                            <Button variant="outline" onClick={() => setResignConfirmation('')}>Cancel</Button>
                                                                        </DialogClose>
                                                                        <Button onClick={handleResign} variant="destructive" disabled={resignConfirmation !== 'RESIGN' || isResigning}>
                                                                            {isResigning && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                                            Confirm Resignation
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                            <p className="text-xs text-muted-foreground px-1">This will demote you to a personal account.</p>
                                                        </>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        <Dialog open={isCommunityDialogOpen} onOpenChange={setIsCommunityDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline">Change Home Community</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Change Your Home Community</DialogTitle>
                                                    <DialogDescription>
                                                        Select a new home community.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <CommunitySelector selection={communitySelection} onSelectionChange={setCommunitySelection} />
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button disabled={isSwitching || !communitySelection?.community || communitySelection.community === 'other'}>
                                                                {isSwitching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                Set New Home Community
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                                                            <DialogDescription>
                                                                This action is permanent and will change your home community. This will affect where you receive local content by default.
                                                            </DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter>
                                                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                                <Button variant="destructive" onClick={handleChangeCommunity}>Confirm</Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                     </div>
                                </CardFooter>
                            )}
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="h-6 w-6 text-primary" />
                                    My Leadership Hubs
                                </CardTitle>
                                <CardDescription>
                                    Manage additional communities to expand your reach and revenue.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingHubs ? (
                                    <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin"/></div>
                                ) : leadershipHubs.length > 0 ? (
                                    <Accordion type="single" collapsible className="w-full">
                                        {leadershipHubs.map(hub => (
                                            <AccordionItem key={hub.id} value={hub.id}>
                                                <AccordionTrigger>
                                                    <div className="flex justify-between items-center w-full pr-4">
                                                        <span>{hub.name}</span>
                                                        <StatusBadge status={hub.status} />
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm text-muted-foreground">{hub.region}, {hub.state}</p>
                                                        <Button size="sm" onClick={() => handleSwitchToFavourite(hub.id)}>Go to Dashboard</Button>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">You are not leading any additional communities.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <KeyRound className="h-6 w-6 text-primary" />
                                    Account Security
                                </CardTitle>
                                <CardDescription>
                                    Manage your account security settings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>Change Password</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Change Your Password</DialogTitle>
                                            <DialogDescription>
                                                Enter your current password and a new password below.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="current-password">Current Password</Label>
                                                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-password">New Password</Label>
                                                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                                                <Input id="confirm-new-password" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                            <Button onClick={handleChangePassword} disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmNewPassword}>
                                                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Save Changes
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="lg:col-span-1 space-y-8">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Heart className="h-6 w-6 text-primary" />
                                    Favourite Communities
                                </CardTitle>
                                <CardDescription>
                                    A list of your favourite community hubs for quick access.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {loadingFavourites ? (
                                    <div className="flex justify-center items-center h-24">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : favouriteCommunitiesDetails.length > 0 ? (
                                    favouriteCommunitiesDetails.map(community => (
                                        <div key={community.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                                            <div>
                                                <Button variant="link" className="p-0 h-auto" onClick={() => handleSwitchToFavourite(community.id)}>
                                                    {community.name}
                                                </Button>
                                                <p className="text-xs text-muted-foreground">{community.region}, {community.state}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => handleRemoveFromFavourites(community.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">You haven't added any communities to your favourites yet.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarIcon className="h-6 w-6 text-primary" />
                                    My Calendar
                                </CardTitle>
                                <CardDescription>Your personal schedule of community events.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <p className="text-sm text-muted-foreground">Calendar functionality will be added in a future update.</p>
                            </CardContent>
                        </Card>
                     </div>
                </div>
                 <div className="pt-8 mt-8 border-t">
                    <Card className="border-destructive bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="text-destructive flex items-center gap-2">
                                <ShieldAlert className="h-6 w-6" />
                                Account Closure
                            </CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-4">
                            <div className="text-sm text-destructive/90 space-y-2">
                                <p><strong className="font-semibold text-destructive">Important:</strong> Before proceeding, you must manually cancel any active business subscriptions through Stripe and close any businesses you manage. We are not responsible for any outstanding charges after your account is deleted.</p>
                                <p>This action is irreversible. Your account and all associated data will be permanently deleted from our servers immediately.</p>
                            </div>
                             {hasActiveSubscription && (
                                <Alert variant="destructive" className="mt-4">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Active Subscriptions Found!</AlertTitle>
                                    <AlertDescription>
                                        Our system indicates you have active subscriptions. Deleting your account will NOT automatically cancel your Stripe billing. Please manage your subscriptions directly with Stripe to prevent future charges.
                                    </AlertDescription>
                                </Alert>
                            )}
                             <div className="flex items-center space-x-2 pt-4 border-t">
                                <Checkbox id="deletion-terms" checked={agreedToDeletionTerms} onCheckedChange={(checked) => setAgreedToDeletionTerms(checked as boolean)} />
                                <Label htmlFor="deletion-terms" className="text-sm font-normal">
                                    I acknowledge that I have read and agree to the{' '}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <span className="underline text-primary cursor-pointer">Account Deletion Policy</span>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                                            <DialogHeader className="p-6 pb-2 border-b">
                                                <DialogTitle>Account Deletion Policy</DialogTitle>
                                            </DialogHeader>
                                            <ScrollArea className="h-full">
                                                <div className="p-6">
                                                    <LegalDocumentDisplay documentId="wfXzbllVHmadHLHL2csT" />
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
                        </CardContent>
                        <CardFooter>
                            {userProfile?.role === 'president' ? (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="inline-block" tabIndex={0}>
                                            <Button variant="destructive" disabled>
                                                Close My Account
                                            </Button>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <ShieldAlert className="h-6 w-6 text-destructive" />
                                                Important Information for Community Presidents
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4 text-sm">
                                            <p>As a Community President, you have responsibilities that must be resolved before your account can be closed. This is to ensure a smooth transition and the continued operation of your community.</p>
                                            <h4 className="font-semibold">Required Actions:</h4>
                                            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                                <li>
                                                    <strong>Transfer Leadership:</strong> The community must have a leader. Please go to your <Link href="/leader/settings" className="text-primary underline">Community Settings</Link> and appoint a successor, or contact platform administration to be removed as president.
                                                </li>
                                                <li>
                                                    <strong>Close Financial Accounts:</strong> You must disconnect and close your community's Stripe account to stop all payments and revenue sharing. We are not responsible for any financial activity after your account is closed.
                                                </li>
                                            </ol>
                                            <p className="mt-4 font-semibold">The "Close My Account" button will become available once you are no longer a Community President.</p>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button>I Understand</Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <Button variant="destructive" onClick={() => setIsClosureDialogOpen(true)} disabled={!agreedToDeletionTerms}>
                                    Close My Account
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>

             <Dialog open={isClosureDialogOpen} onOpenChange={setIsClosureDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                         <DialogDescription>
                            This action cannot be undone. 
                            {hasActiveSubscription && (
                                <span className="font-semibold text-destructive-foreground block mt-2">
                                    Important: Deleting your account will not automatically cancel active Stripe subscriptions. You must manage billing separately to avoid future charges.
                                </span>
                            )}
                            To confirm, please enter your password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label htmlFor="closure-password">Password</Label>
                        <Input
                            id="closure-password"
                            type="password"
                            value={closurePassword}
                            onChange={e => setClosurePassword(e.target.value)}
                            placeholder="Enter your password to confirm"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleAccountClosure} variant="destructive" disabled={isClosingAccount || !closurePassword || !agreedToDeletionTerms}>
                            {isClosingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm & Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
    

    