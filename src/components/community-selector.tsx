
'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, getDocs } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2, Wrench } from 'lucide-react';
import { verifyLocationAction } from '@/lib/actions/locationActions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';


export type CommunitySelection = {
  id: string | null;
  country: string | null;
  state: string | null;
  region: string | null;
  community: string | null;
};

type Location = {
  id: string;
  name: string;
  parent?: string;
  status?: 'active' | 'pending' | 'suspended' | 'inactive';
  leaderCount?: number;
};

interface CommunitySelectorProps {
  selection: CommunitySelection | null;
  onSelectionChange: (selection: CommunitySelection | null) => void;
  allowCreation?: boolean;
  isLocationVerified?: boolean;
  onVerificationChange?: (isVerified: boolean) => void;
  otherStateName?: string;
  onOtherStateNameChange?: (name: string) => void;
  otherRegionName?: string;
  onOtherRegionNameChange?: (name: string) => void;
  otherCommunityName?: string;
  onOtherCommunityNameChange?: (name: string) => void;
}

const StatusBadge = ({ status, leaderCount }: { status?: Location['status']; leaderCount?: number }) => {
    let effectiveStatus: 'Active' | 'Needs Leader' | 'Pending Approval' | 'Inactive' | null = null;
    let effectiveColorClass = 'bg-gray-400';

    if (status === 'active' && (leaderCount !== undefined && leaderCount > 0)) {
        effectiveStatus = 'Active';
        effectiveColorClass = 'bg-green-500';
    } else if (status === 'active' && leaderCount === 0) {
        effectiveStatus = 'Needs Leader';
        effectiveColorClass = 'bg-yellow-500';
    } else if (status === 'pending') {
        effectiveStatus = 'Pending Approval';
        effectiveColorClass = 'bg-purple-500';
    } else if (status === 'suspended' || status === 'inactive') {
        effectiveStatus = 'Inactive';
        effectiveColorClass = 'bg-red-500';
    }
    
    if (!effectiveStatus) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <span className={cn("inline-block h-2.5 w-2.5 rounded-full", effectiveColorClass)} />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{effectiveStatus}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function CommunitySelector({
    selection,
    onSelectionChange,
    allowCreation = false,
    isLocationVerified,
    onVerificationChange,
    otherStateName,
    onOtherStateNameChange,
    otherRegionName,
    onOtherRegionNameChange,
    otherCommunityName,
    onOtherCommunityNameChange,
}: CommunitySelectorProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState({ countries: true, states: false, regions: false, communities: false });
  const [countries, setCountries] = React.useState<Location[]>([]);
  const [states, setStates] = React.useState<Location[]>([]);
  const [regions, setRegions] = React.useState<Location[]>([]);
  const [communities, setCommunities] = React.useState<Location[]>([]);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedCountry = selection?.country;
  const selectedState = selection?.state;
  const selectedRegion = selection?.region;
  const selectedCommunity = selection?.community;
  
  const handleSelect = (type: keyof Omit<CommunitySelection, 'id'>, id: string | null) => {
    const newSelection: CommunitySelection = {
        id: selection?.id || null,
        country: type === 'country' ? id : selection?.country || null,
        state: type === 'state' ? id : (type === 'country' ? null : selection?.state || null),
        region: type === 'region' ? id : (type === 'state' || type === 'country' ? null : selection?.region || null),
        community: type === 'community' ? id : (type === 'region' || type === 'state' || type === 'country' ? null : selection?.community || null),
    };
    onSelectionChange(newSelection);
    if(onVerificationChange) onVerificationChange(false);
  };
  
  // Fetch Countries
  React.useEffect(() => {
    if (!db) return;
    setLoading(prev => ({ ...prev, countries: true }));
    const q = query(collection(db, "locations"), where("type", "==", "country"));
    const unsub = onSnapshot(q, (snapshot) => {
      const countryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a, b) => {
        const popular = ['United Kingdom', 'United States'];
        const aIsPopular = popular.indexOf(a.name);
        const bIsPopular = popular.indexOf(b.name);

        if (aIsPopular > -1 && bIsPopular > -1) {
            return aIsPopular - bIsPopular;
        }
        if (aIsPopular > -1) {
            return -1;
        }
        if (bIsPopular > -1) {
            return 1;
        }
        return a.name.localeCompare(b.name);
      });
      setCountries(countryList);
      setLoading(prev => ({ ...prev, countries: false }));
    });
    return () => unsub();
  }, [db]);

  // Fetch States based on selected country
  React.useEffect(() => {
    if (!db || !selectedCountry) { setStates([]); return; }
    setLoading(prev => ({ ...prev, states: true }));
    const q = query(collection(db, "locations"), where("type", "==", "state"), where("parent", "==", selectedCountry));
    const unsub = onSnapshot(q, (snapshot) => {
      const stateList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setStates(stateList);
      setLoading(prev => ({ ...prev, states: false }));
    });
    return () => unsub();
  }, [db, selectedCountry]);

  // Fetch Regions based on selected state
  React.useEffect(() => {
    if (!db || !selectedState || selectedState === 'new') { setRegions([]); return; }
    setLoading(prev => ({ ...prev, regions: true }));
    const q = query(collection(db, "locations"), where("type", "==", "region"), where("parent", "==", selectedState));
    const unsub = onSnapshot(q, (snapshot) => {
      const regionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)).sort((a,b) => a.name.localeCompare(b.name));
      setRegions(regionList);
      setLoading(prev => ({ ...prev, regions: false }));
    });
    return () => unsub();
  }, [db, selectedState]);
  
  // Fetch Communities based on selected region
  React.useEffect(() => {
    if (!db || !selectedRegion || selectedRegion === 'new') {
      setCommunities([]);
      return;
    }

    const fetchCommunities = async () => {
      setLoading((prev) => ({ ...prev, communities: true }));
      const visibleStatuses = ['active', 'pending', 'suspended', 'inactive'];
      let communityList: Location[] = [];

      try {
        // Method 1: Most efficient, using regionId
        const qById = query(
          collection(db, 'communities'),
          where('regionId', '==', selectedRegion)
        );
        const snapshotById = await getDocs(qById);

        if (!snapshotById.empty) {
          communityList = snapshotById.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Location))
            .filter((community) =>
              visibleStatuses.includes(community.status || 'active')
            );
        }

        // Method 2: Fallback to stateId if regionId yields nothing
        if (communityList.length === 0 && selectedState) {
          const selectedRegionName = regions.find(r => r.id === selectedRegion)?.name;
          if (selectedRegionName) {
            const qByStateId = query(collection(db, 'communities'), where('stateId', '==', selectedState));
            const snapshotByStateId = await getDocs(qByStateId);
            if (!snapshotByStateId.empty) {
              communityList = snapshotByStateId.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Location))
                .filter(c => c.region === selectedRegionName && visibleStatuses.includes(c.status || 'active'));
            }
          }
        }
        
        // Method 3: Final fallback to query by country and filter client-side
        if (communityList.length === 0 && selectedCountry) {
            const selectedRegionName = regions.find((r) => r.id === selectedRegion)?.name;
            const selectedStateName = states.find((s) => s.id === selectedState)?.name;
            const selectedCountryName = countries.find((c) => c.id === selectedCountry)?.name;

            if (selectedCountryName && selectedStateName && selectedRegionName) {
                const qByCountry = query(collection(db, 'communities'), where('country', '==', selectedCountryName));
                const snapshotByCountry = await getDocs(qByCountry);
                communityList = snapshotByCountry.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Location))
                    .filter(c => 
                        c.state === selectedStateName && 
                        c.region === selectedRegionName && 
                        visibleStatuses.includes(c.status || 'active')
                    );
            }
        }

        setCommunities(communityList.sort((a, b) => a.name.localeCompare(b.name)));

      } catch (error: any) {
        console.error('Error fetching communities:', error);
        toast({
          title: 'Error Loading Communities',
          description: error.message || 'Could not load communities for the selected region.',
          variant: 'destructive',
        });
        setCommunities([]);
      } finally {
        setLoading((prev) => ({ ...prev, communities: false }));
      }
    };

    fetchCommunities();
  }, [db, selectedRegion, regions, selectedState, states, selectedCountry, countries, toast]);
  
  const handleVerifyLocation = async () => {
    if (!onVerificationChange) return;
    setIsVerifying(true);
    const result = await verifyLocationAction({
        country: countries.find(c => c.id === selectedCountry)?.name || '',
        state: otherStateName || states.find(s => s.id === selectedState)?.name || '',
        region: otherRegionName || regions.find(r => r.id === selectedRegion)?.name || '',
        community: otherCommunityName || '',
    });

    if (result.isPlausible) {
        onVerificationChange(true);
        toast({ title: "Location Verified", description: result.reason });
    } else {
        onVerificationChange(false);
        toast({ title: "Location Not Verified", description: result.reason, variant: "destructive" });
    }
    setIsVerifying(false);
};

  const renderSelect = (title: string, items: Location[], type: keyof Omit<CommunitySelection, 'id'>, selectedId: string | null | undefined, onSelect: (id: string | null) => void, isLoading: boolean, allowNew = false, disabled = false) => (
    <div className="space-y-2">
        <Label>{title}</Label>
        <Select onValueChange={(val) => onSelect(val === 'new' ? 'new' : val)} value={selectedId || ""} disabled={disabled || isLoading}>
            <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : `Select a ${title.toLowerCase().replace(' *','')}...`} />
            </SelectTrigger>
            <SelectContent>
                {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                           {type === 'community' && <StatusBadge status={item.status} leaderCount={item.leaderCount} />}
                           <span>{item.name}</span>
                        </div>
                    </SelectItem>
                ))}
                {allowNew && <SelectItem value="new">Create New...</SelectItem>}
            </SelectContent>
        </Select>
    </div>
  );
  
  if (!isClient) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderSelect('Country *', countries, 'country', selectedCountry, (id) => handleSelect('country', id), loading.countries)}
      
      {selectedCountry && renderSelect('State / County *', states, 'state', selectedState, (id) => handleSelect('state', id), loading.states, allowCreation)}
      
      {selectedState && selectedState !== 'new' && renderSelect('Region / Area *', regions, 'region', selectedRegion, (id) => handleSelect('region', id), loading.regions, allowCreation)}
      
      {selectedRegion && selectedRegion !== 'new' && renderSelect('Community *', communities, 'community', selectedCommunity, (id) => handleSelect('community', id), loading.communities, allowCreation)}
      
      {allowCreation && (
          <div className="space-y-4">
          {selectedState === 'new' && (
              <div className="space-y-2 p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                  <Label>New State / County Name</Label>
                  <Input value={otherStateName} onChange={e => onOtherStateNameChange?.(e.target.value)} placeholder="e.g., California"/>
              </div>
          )}
          {(selectedState === 'new' || selectedRegion === 'new') && (
              <div className="space-y-2 p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                  <Label>New Region / City Name</Label>
                  <Input value={otherRegionName} onChange={e => onOtherRegionNameChange?.(e.target.value)} placeholder="e.g., Los Angeles County"/>
              </div>
          )}
          {(selectedState === 'new' || selectedRegion === 'new' || selectedCommunity === 'other') && (
              <div className="space-y-2 p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                  <Label>New Community / Town Name</Label>
                  <Input value={otherCommunityName} onChange={e => onOtherCommunityNameChange?.(e.target.value)} placeholder="e.g., Hollywood"/>
                   <Button type="button" onClick={handleVerifyLocation} disabled={isVerifying || !otherCommunityName}>
                      {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                      Verify Location
                  </Button>
              </div>
          )}
          </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground p-2 border rounded-md mt-4">
        <span className="font-semibold">Legend:</span>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>Active</div>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>Needs Leader</div>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500"></span>Pending Approval</div>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>Inactive</div>
    </div>
    </div>
  );
}
