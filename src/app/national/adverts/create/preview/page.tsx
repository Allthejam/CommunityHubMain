'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, ArrowRight, CheckCircle, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateActiveAdvertAction } from '@/lib/actions/advertActions';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

function AdvertPreviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const advertType = searchParams.get('type') || 'featured';
  const advertId = searchParams.get('id');
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [data, setData] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch real document status to ensure we handle Active ads correctly
  const advertRef = useMemoFirebase(() => (advertId ? doc(db, 'adverts', advertId) : null), [advertId, db]);
  const { data: dbAdvert, isLoading } = useDoc(advertRef);

  React.useEffect(() => {
    const stored = sessionStorage.getItem('advertPreviewData');
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  const handleNext = async () => {
    const status = dbAdvert?.status || data?.status;
    const isPaid = status === 'Active' || status === 'Scheduled' || status === 'Pending Approval';

    if (isPaid && advertId && user) {
        setIsSaving(true);
        const result = await updateActiveAdvertAction({
            userId: user.uid,
            advertId: advertId,
            advertData: data
        });

        if (result.success) {
            toast({ title: 'Campaign Updated', description: 'Your changes have been saved and admins notified.' });
            sessionStorage.removeItem('advertPreviewData');
            router.push('/national/adverts');
        } else {
            toast({ title: 'Update Failed', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    } else {
        router.push(`/national/adverts/create/targeting?type=${advertType}${advertId ? `&id=${advertId}` : ''}`);
    }
  };

  if (!data || isLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>;

  const getTargetLink = () => {
    if (data.primaryLinkType === 'profile' && user) {
        return `/business-profile/${user.uid}`;
    }
    return data.websiteLink || '#';
  };

  const linkLabel = data.primaryLinkType === 'profile' ? 'View Profile' : 'Visit Website';
  const isPaid = dbAdvert?.status === 'Active' || dbAdvert?.status === 'Scheduled' || dbAdvert?.status === 'Pending Approval';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/national/adverts/create/content?type=${advertType}${advertId ? `&id=${advertId}` : ''}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Content
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Eye className="h-8 w-8 text-primary" />
          Campaign Preview {isPaid ? '(Updating Live Ad)' : '(Step 3 of 4)'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Review how your advertisement will appear to community members across the platform.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Expanded Modal Preview */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Full View / Learn More Popup</h3>
            <Card className="overflow-hidden border-2 border-primary shadow-2xl">
              <div className="relative aspect-video w-full bg-muted">
                {data.image ? (
                  <Image src={data.image} alt={data.headline} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No image</div>
                )}
              </div>
              <CardHeader className="space-y-2 p-6">
                <div className="flex items-center justify-between gap-4">
                  <Badge variant="secondary" className="capitalize text-xs font-semibold">
                    {data.type} National Partner
                  </Badge>
                  {data.emailAddress && (
                    <span className="text-xs text-muted-foreground">{data.emailAddress}</span>
                  )}
                </div>
                <CardTitle className="text-2xl font-bold font-headline">{data.headline}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-foreground/80">{data.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <div className="p-4 rounded-xl bg-muted/20 border text-xs leading-relaxed text-muted-foreground">
                  {data.fullDescription ? (
                    <div 
                      className="prose dark:prose-invert max-w-none text-xs" 
                      dangerouslySetInnerHTML={{ __html: data.fullDescription }} 
                    />
                  ) : (
                    <p className="italic">No extended biography provided.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center bg-muted/30 border-t p-4 px-6">
                <Button variant="outline" size="sm" asChild>
                  <a href={getTargetLink()} target="_blank" rel="noopener noreferrer">
                    {linkLabel}
                  </a>
                </Button>
                <Badge variant="outline" className="text-xs">Live Interactive Preview</Badge>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Right Preview Column: Feed Card Preview */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Community Feed Card</h3>
            <p className="text-xs text-muted-foreground">How it renders in the live community feed.</p>
          </div>

          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-all">
            <div className="relative aspect-video w-full bg-muted">
              {data.image && (
                <Image src={data.image} alt={data.headline} fill className="object-cover" />
              )}
            </div>
            <CardHeader className="p-4 space-y-1">
              <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold">Featured</Badge>
              <CardTitle className="text-base font-bold line-clamp-1">{data.headline}</CardTitle>
              <CardDescription className="text-xs line-clamp-2">{data.shortDescription}</CardDescription>
            </CardHeader>
            <CardFooter className="p-4 pt-0 flex justify-between items-center">
              <span className="text-[11px] font-bold text-primary">Learn More &rarr;</span>
            </CardFooter>
          </Card>

          {/* Action Bar */}
          <Card className="p-6 border-2 border-primary/30 bg-primary/5 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <CheckCircle className="h-4 w-4" /> Ready for next step
            </div>
            <p className="text-xs text-muted-foreground">
              {isPaid 
                ? 'Your campaign is currently active. Saving updates will instantly publish the creative modifications.'
                : 'Next, configure geographic targeting, demographics, and campaign duration.'}
            </p>
            <Button onClick={handleNext} disabled={isSaving} className="w-full shadow-lg">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPaid ? 'Save Active Changes' : 'Proceed to Targeting & Checkout'}
              {!isPaid && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NationalAdvertPreviewPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>}>
      <AdvertPreviewPageContent />
    </React.Suspense>
  );
}
