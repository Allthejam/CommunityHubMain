
'use client';
import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type Location = { id: string; name: string; };

export interface RefinedScope {
  id: string;
  country: string;
  states: string[];
  regions: string[];
  communities: string[];
}

interface BroadcastAudienceSelectorProps {
  initialScope: { country: string; name: string; };
  selection: RefinedScope;
  onSelectionChange: (newSelection: RefinedScope) => void;
}

const CommunityNode = ({ regionId, selection, onSelectionChange }: { regionId: string, selection: RefinedScope, onSelectionChange: (newSelection: RefinedScope) => void; }) => {
    const db = useFirestore();
    const communitiesQuery = useMemoFirebase(() => db ? query(collection(db, 'communities'), where('regionId', '==', regionId)) : null, [db, regionId]);
    const { data: communities, isLoading: communitiesLoading } = useCollection<Location>(communitiesQuery);

    const onCommunityToggle = (communityId: string, checked: boolean) => {
        const newCommunities = checked ? [...selection.communities, communityId] : selection.communities.filter(id => id !== communityId);
        onSelectionChange({ ...selection, communities: newCommunities });
    };

    if (communitiesLoading) return <div className="pl-4"><Loader2 className="animate-spin h-4 w-4" /></div>;
    if (!communities || communities.length === 0) return <p className="pl-4 text-xs text-muted-foreground">No communities in this region.</p>;

    return (
        <div className="pl-4 border-l ml-4 space-y-2">
             <h4 className="font-semibold text-xs mb-2 text-muted-foreground">Communities</h4>
            {communities.map(community => (
                <div key={community.id} className="flex items-center space-x-2">
                    <Checkbox
                        id={`community-${community.id}`}
                        checked={selection.communities.includes(community.id)}
                        onCheckedChange={(checked) => onCommunityToggle(community.id, !!checked)}
                    />
                    <Label htmlFor={`community-${community.id}`} className="font-normal text-sm">{community.name}</Label>
                </div>
            ))}
        </div>
    );
}

const RegionNode = ({ region, selection, onSelectionChange }: { region: Location, selection: RefinedScope, onSelectionChange: (newSelection: RefinedScope) => void; }) => {
    return (
        <AccordionItem value={region.id}>
            <AccordionTrigger leadingContent={
                <Checkbox
                    id={`region-${region.id}`}
                    checked={selection.regions.includes(region.id)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => {
                        const newRegions = checked ? [...selection.regions, region.id] : selection.regions.filter(id => id !== region.id);
                        onSelectionChange({ ...selection, regions: newRegions });
                    }}
                />
            }>
                <Label htmlFor={`region-${region.id}`} className="font-normal">{region.name}</Label>
            </AccordionTrigger>
            <AccordionContent className="pl-6">
                 <CommunityNode regionId={region.id} selection={selection} onSelectionChange={onSelectionChange} />
            </AccordionContent>
        </AccordionItem>
    )
};


const StateNode = ({ state, selection, onSelectionChange }: { state: Location, selection: RefinedScope, onSelectionChange: (newSelection: RefinedScope) => void; }) => {
    const db = useFirestore();

    const regionsQuery = useMemoFirebase(() => db ? query(collection(db, 'locations'), where('type', '==', 'region'), where('parent', '==', state.id)) : null, [db, state.id]);
    const { data: regions, isLoading: regionsLoading } = useCollection<Location>(regionsQuery);

    return (
        <AccordionItem value={state.id}>
            <AccordionTrigger leadingContent={
                 <Checkbox
                    id={`state-${state.id}`}
                    checked={selection.states.includes(state.id)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => {
                        const newStates = checked ? [...selection.states, state.id] : selection.states.filter(id => id !== state.id);
                        onSelectionChange({ ...selection, states: newStates });
                    }}
                />
            }>
                <Label htmlFor={`state-${state.id}`} className="font-normal">{state.name}</Label>
            </AccordionTrigger>
            <AccordionContent className="pl-6">
                {regionsLoading ? <Loader2 className="animate-spin h-4 w-4" /> : (
                    <Accordion type="multiple" className="w-full">
                        {regions?.sort((a,b) => a.name.localeCompare(b.name)).map(region => (
                            <RegionNode key={region.id} region={region} selection={selection} onSelectionChange={onSelectionChange} />
                        ))}
                    </Accordion>
                )}
            </AccordionContent>
        </AccordionItem>
    );
};

export const BroadcastAudienceSelector: React.FC<BroadcastAudienceSelectorProps> = ({ initialScope, selection, onSelectionChange }) => {
  const db = useFirestore();

  const statesQuery = useMemoFirebase(() => db ? query(collection(db, 'locations'), where('type', '==', 'state'), where('parent', '==', initialScope.country)) : null, [db, initialScope.country]);
  const { data: states, isLoading: statesLoading } = useCollection<Location>(statesQuery);
  
  if (statesLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <Accordion type="multiple" className="w-full">
        {states?.sort((a,b) => a.name.localeCompare(b.name)).map(state => (
            <StateNode key={state.id} state={state} selection={selection} onSelectionChange={onSelectionChange} />
        ))}
    </Accordion>
  );
};
