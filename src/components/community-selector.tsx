'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Loader2, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verifyLocationAction } from '@/lib/actions/locationActions';

export type CommunitySelection = {
  id: string | null;
  country: string | null;
  state: string | null;
  region: string | null;
  community: string | null;
  communityName?: string | null;
};

type CommunitySelectorProps = {
  selection: CommunitySelection | null;
  onSelectionChange: (selection: CommunitySelection) => void;
  isLocationVerified?: boolean;
  onVerificationChange?: (isVerified: boolean) => void;
  allowCreation?: boolean;
  otherStateName?: string;
  onOtherStateNameChange?: (value: string) => void;
  otherRegionName?: string;
  onOtherRegionNameChange?: (value: string) => void;
  otherCommunityName?: string;
  onOtherCommunityNameChange?: (value: string) => void;
};

type Location = {
  id: string;
  name: string;
  parent?: string;
};

type Community = Location & {
    status: 'active' | 'pending' | 'suspended';
    memberCount: number;
    leaderCount: number;
}

const StatusIndicator = ({ community }: { community: Community }) => {
    let color = 'bg-gray-400';
    let tooltip = 'Unknown Status';

    const leaderCount = community.leaderCount || 0;
    const memberCount = community.memberCount || 0;

    if (community.status === 'active' && leaderCount > 0) {
        color = 'bg-green-500';
        tooltip = 'Active and managed';
    } else if (community.status === 'pending' && leaderCount > 0) {
        color = 'bg-purple-500';
        tooltip = 'Pending Approval';
    } else if (leaderCount === 0 && memberCount > 0) {
        color = 'bg-amber-500';
        tooltip = 'Needs a Leader';
    } else if (leaderCount === 0 && memberCount === 0) {
        color = 'bg-red-500';
        tooltip = 'Inactive';
    }

    return <span title={tooltip} className={cn('h-2 w-2 rounded-full', color)}></span>;
};

export function CommunitySelector({ 
    selection, 
    onSelectionChange, 
    isLocationVerified = false, 
    onVerificationChange = () => {},
    allowCreation = true,
    otherStateName = '',
    onOtherStateNameChange = () => {},
    otherRegionName = '',
    onOtherRegionNameChange = () => {},
    otherCommunityName = '',
    onOtherCommunityNameChange = () => {},
}: CommunitySelectorProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [countries, setCountries] = React.useState<Location[]>([]);
  const [states, setStates] = React.useState<Location[]>([]);
  const [regions, setRegions] = React.useState<Location[]>([]);
  const [communities, setCommunities] = React.useState<Community[]>([]);
  
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verificationResult, setVerificationResult] = React.useState<{ plausible: boolean, reason: string } | null>(null);

  const componentId = React.useId();

  // Fetch countries
  React.useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "locations"), where("type", "==", "country"));
    const unsub = onSnapshot(q, (snapshot) => {
      const countryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setCountries(countryList);
    });
    return () => unsub();
  }, [db]);

  // Fetch states based on country
  React.useEffect(() => {
    if (!db || !selection?.country) {
      setStates([]);
      if (selection?.state) onSelectionChange({ ...selection, state: null, region: null, community: null });
      return;
    }
    const q = query(collection(db, "locations"), where("type", "==", "state"), where("parent", "==", selection.country));
    const unsub = onSnapshot(q, (snapshot) => {
      const stateList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setStates(stateList);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selection?.country]);

  // Fetch regions based on state
  React.useEffect(() => {
    if (!db || !selection?.state || selection.state === 'new') {
      setRegions([]);
      if (selection?.region) onSelectionChange({ ...selection, region: null, community: null });
      return;
    }
    const q = query(collection(db, "locations"), where("type", "==", "region"), where("parent", "==", selection.state));
    const unsub = onSnapshot(q, (snapshot) => {
      const regionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setRegions(regionList);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selection?.state]);
  
  // Fetch communities based on region
  React.useEffect(() => {
    if (!db || !selection?.region || selection.region === 'new') {
      setCommunities([]);
       if (selection?.community) onSelectionChange({ ...selection, community: null });
      return;
    }
    const regionName = regions.find(r => r.id === selection.region)?.name;
    if (!regionName) return;

    const q = query(
        collection(db, 'communities'), 
        where('region', '==', regionName),
        where('visibility', '==', 'public')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const communityList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Community)).sort((a,b) => a.name.localeCompare(b.name));
      setCommunities(communityList);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selection?.region, regions]);
  
  const resetVerification = React.useCallback(() => {
    setVerificationResult(null);
    onVerificationChange(false);
  }, [onVerificationChange]);

  const handleCountryChange = (countryId: string) => {
    resetVerification();
    onSelectionChange({ id: componentId, country: countryId, state: null, region: null, community: null });
  };
  const handleStateChange = (stateId: string) => {
    resetVerification();
    onSelectionChange({ ...(selection as CommunitySelection), state: stateId, region: null, community: null });
  };
  const handleRegionChange = (regionId: string) => {
    resetVerification();
    onSelectionChange({ ...(selection as CommunitySelection), region: regionId, community: null });
  };
   const handleCommunityChange = (communityId: string) => {
    resetVerification();
    const communityData = communities.find(c => c.id === communityId);
    if(communityId !== 'other') {
        onVerificationChange(true); // Existing communities are considered verified.
    }
    onSelectionChange({ 
        ...(selection as CommunitySelection), 
        community: communityId,
        communityName: communityData ? communityData.name : null,
    });
  };

  const handleVerifyLocation = async () => {
    const selectedCountry = countries.find(c => c.id === selection?.country);
    if (!selectedCountry) {
        toast({ title: 'Please select a country.', variant: 'destructive' });
        return;
    }

    const locationParams = {
        country: selectedCountry.name,
        state: '',
        region: '',
        community: ''
    };

    if (selection?.state === 'new') {
        locationParams.state = otherStateName;
        locationParams.region = otherRegionName;
        locationParams.community = otherCommunityName;
    } else {
        locationParams.state = states.find(s => s.id === selection?.state)?.name || '';
        if (selection?.region === 'new') {
            locationParams.region = otherRegionName;
            locationParams.community = otherCommunityName;
        } else {
            locationParams.region = regions.find(r => r.id === selection?.region)?.name || '';
            if (selection?.community === 'other') {
                locationParams.community = otherCommunityName;
            } else {
                const communityData = communities.find(c => c.id === selection?.community);
                locationParams.community = communityData?.name || '';
            }
        }
    }

    if (!locationParams.state || !locationParams.region || !locationParams.community) {
        toast({ title: 'Missing Information', description: 'Please fill out all new location fields to verify.', variant: 'destructive'});
        return;
    }
    
    setIsVerifying(true);
    setVerificationResult(null);
    onVerificationChange(false);
    
    try {
        const result = await verifyLocationAction(locationParams);

        setVerificationResult({ plausible: result.isPlausible, reason: result.reason });
        onVerificationChange(result.isPlausible);
        
        if (result.isPlausible) {
            toast({ title: 'Location Verified!', description: result.reason, className: 'bg-green-100 dark:bg-green-900/20' });
        } else {
             toast({ title: 'Location Unverifiable', description: result.reason, variant: 'destructive' });
        }

    } catch (error: any) {
        toast({ title: 'Verification Failed', description: error.message, variant: 'destructive'});
    } finally {
        setIsVerifying(false);
    }
  };

  const isCreatingNewLocation = selection?.state === 'new' || selection?.region === 'new' || selection?.community === 'other';

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Country</Label>
        <Select onValueChange={handleCountryChange} value={selection?.country || ''}>
          <SelectTrigger><SelectValue placeholder="Select a Country..." /></SelectTrigger>
          <SelectContent>
            {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>State / Constituent</Label>
        <Select onValueChange={handleStateChange} value={selection?.state || ''} disabled={!selection?.country}>
          <SelectTrigger><SelectValue placeholder="Select a State..." /></SelectTrigger>
          <SelectContent>
             {states.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
             {allowCreation && <SelectItem value="new">Create a new state...</SelectItem>}
          </SelectContent>
        </Select>
      </div>

       {selection?.state === 'new' ? (
        <div className="border p-4 rounded-md space-y-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">Since you're creating a new state, you'll also need to define a new region and community within it.</p>
             <div className="grid gap-2">
                <Label htmlFor={`other-state-${componentId}`}>New State/Constituent Name</Label>
                <Input id={`other-state-${componentId}`} placeholder="e.g., California" value={otherStateName} onChange={e => { onOtherStateNameChange(e.target.value); resetVerification(); }} />
            </div>
             <div className="grid gap-2">
                <Label htmlFor={`other-region-${componentId}`}>New Region Name</Label>
                <Input id={`other-region-${componentId}`} placeholder="e.g., Los Angeles County" value={otherRegionName} onChange={e => { onOtherRegionNameChange(e.target.value); resetVerification(); }} />
            </div>
             <div className="grid gap-2">
                <Label htmlFor={`other-community-${componentId}`}>New Community Name</Label>
                <Input id={`other-community-${componentId}`} placeholder="e.g., Sunnyvale Heights" value={otherCommunityName} onChange={e => { onOtherCommunityNameChange(e.target.value); resetVerification(); }} />
            </div>
        </div>
      ) : (
        <>
            <div className="grid gap-2">
                <Label>Region</Label>
                <Select onValueChange={handleRegionChange} value={selection?.region || ''} disabled={!selection?.state}>
                <SelectTrigger><SelectValue placeholder="Select a Region..." /></SelectTrigger>
                <SelectContent>
                    {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    {allowCreation && <SelectItem value="new">Create a new region...</SelectItem>}
                </SelectContent>
                </Select>
            </div>
            {selection?.region === 'new' && (
                <div className="border p-4 rounded-md space-y-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground">Since you're creating a new region, you'll also need to define a new community within it.</p>
                     <div className="grid gap-2">
                        <Label htmlFor={`other-region-${componentId}`}>New Region Name</Label>
                        <Input id={`other-region-${componentId}`} placeholder="e.g., Los Angeles County" value={otherRegionName} onChange={e => { onOtherRegionNameChange(e.target.value); resetVerification(); }} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor={`other-community-${componentId}`}>New Community Name</Label>
                        <Input id={`other-community-${componentId}`} placeholder="e.g., Sunnyvale Heights" value={otherCommunityName} onChange={e => { onOtherCommunityNameChange(e.target.value); resetVerification(); }} />
                    </div>
                </div>
            )}
            
            {(selection?.region && selection.region !== 'new') && (
            <div className="grid gap-2">
                <Label>Community</Label>
                <Select onValueChange={handleCommunityChange} value={selection?.community || ''} disabled={!selection?.region || selection.region === 'new'}>
                <SelectTrigger><SelectValue placeholder="Select a Community..." /></SelectTrigger>
                <SelectContent>
                    {communities.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                                <StatusIndicator community={c} />
                                <span>{c.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                    {allowCreation && <SelectItem value="other">My community isn't listed</SelectItem>}
                </SelectContent>
                </Select>
                 {selection?.community === 'other' && (
                    <div className="grid gap-2 pt-2">
                        <Label htmlFor={`other-community-${componentId}`} className="text-xs">New Community Name</Label>
                        <Input id={`other-community-${componentId}`} placeholder="e.g., Sunnyvale Heights" value={otherCommunityName} onChange={e => { onOtherCommunityNameChange(e.target.value); resetVerification(); }} />
                    </div>
                )}
            </div>
            )}
        </>
      )}
      
      {isCreatingNewLocation && (
        <div className="flex items-center gap-4 pt-2">
            <Button type="button" onClick={handleVerifyLocation} disabled={isVerifying}>
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                <Sparkles className="mr-2 h-4 w-4" />
                Verify New Location
            </Button>
            {isVerifying ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
             : verificationResult?.plausible ? <CheckCircle className="h-5 w-5 text-green-500" />
             : verificationResult?.plausible === false ? <AlertTriangle className="h-5 w-5 text-destructive" />
             : null}
        </div>
      )}
      
      {selection?.region && (
        <div className="pt-2 text-xs text-muted-foreground space-y-2 border-t mt-4">
            <h4 className="font-semibold text-foreground">Status Legend:</h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span>Active</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span>Needs Leader</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    <span>Pending Approval</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span>Inactive</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
    