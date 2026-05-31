

'use client';
import * as React from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { type Announcement } from '@/lib/announcement-data';
import { Loader2 } from 'lucide-react';

type DetailItem = { id: string; name: string };

const DetailList = ({ title, items }: { title: string; items: DetailItem[] }) => {
    if (items.length === 0) return null;
    return (
        <div className="space-y-1">
            <h4 className="text-sm font-semibold">{title}</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {items.map(item => <li key={item.id}>{item.name}</li>)}
            </ul>
        </div>
    );
};

export const TargetAudienceDetails = ({ announcement }: { announcement: Announcement | null }) => {
    const db = useFirestore();
    const [countries, setCountries] = React.useState<DetailItem[]>([]);
    const [states, setStates] = React.useState<DetailItem[]>([]);
    const [regions, setRegions] = React.useState<DetailItem[]>([]);
    const [communities, setCommunities] = React.useState<DetailItem[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const audience = (announcement as any)?.audience;
        if (!audience || !db) return;

        const fetchDetails = async () => {
            setLoading(true);
            const { countries: countryIds, states: stateIds, regions: regionIds, communities: communityIds } = audience;
            
            const fetchData = async (ids: string[] | undefined, collectionName: string): Promise<DetailItem[]> => {
                if (!ids || ids.length === 0) return [];
                const chunks = [];
                for (let i = 0; i < ids.length; i += 30) {
                    chunks.push(ids.slice(i, i + 30));
                }

                try {
                    const results: DetailItem[] = [];
                    for (const chunk of chunks) {
                        const q = query(collection(db, collectionName), where(documentId(), 'in', chunk));
                        const snapshot = await getDocs(q);
                        snapshot.docs.forEach(doc => results.push({ id: doc.id, name: doc.data().name }));
                    }
                    return results;
                } catch (e) {
                    console.error(`Error fetching from ${collectionName}:`, e);
                    return [];
                }
            };
            
            const [countryData, stateData, regionData, communityData] = await Promise.all([
                fetchData(countryIds, 'locations'),
                fetchData(stateIds, 'locations'),
                fetchData(regionIds, 'locations'),
                fetchData(communityIds, 'communities'),
            ]);

            setCountries(countryData);
            setStates(stateData);
            setRegions(regionData);
            setCommunities(communityData);
            setLoading(false);
        };
        fetchDetails();

    }, [announcement, db]);

    if (loading) {
        return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading audience details...</div>
    }
    
    // Display only the most specific level of targeting provided
    if (communities.length > 0) {
        return <DetailList title="Targeted Communities" items={communities} />;
    }
    if (regions.length > 0) {
        return <DetailList title="Targeted Regions" items={regions} />;
    }
    if (states.length > 0) {
        return <DetailList title="Targeted States" items={states} />;
    }
    if (countries.length > 0) {
        return <DetailList title="Targeted Countries" items={countries} />;
    }

    return <p className="text-sm text-muted-foreground">Targeted to: All Users</p>;
};
