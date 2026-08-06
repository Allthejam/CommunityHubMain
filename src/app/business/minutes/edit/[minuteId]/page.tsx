
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { RichTextEditor } from '@/components/rich-text-editor';
import { updateMeetingMinuteAction } from '@/lib/actions/businessActions';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

function EditMinutePageContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const minuteId = params.minuteId as string;
    const businessId = searchParams.get('businessId');
    const { toast } = useToast();
    const db = useFirestore();

    const [title, setTitle] = React.useState('');
    const [date, setDate] = React.useState<Date | undefined>();
    const [content, setContent] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const businessRef = useMemoFirebase(() => (db && businessId ? doc(db, 'businesses', businessId) : null), [db, businessId]);
    const { data: businessData, isLoading } = useDoc(businessRef);
    
    React.useEffect(() => {
        if (businessData && minuteId) {
            const minute = (businessData.meetingMinutes || []).find((m: any) => m.id === minuteId);
            if (minute) {
                setTitle(minute.title);
                setContent(minute.content);
                setDate(minute.date?.toDate ? minute.date.toDate() : new Date(minute.date));
            } else {
                toast({ title: "Error", description: "Meeting minute not found.", variant: "destructive" });
                router.push(`/business/businesses/edit/${businessId}`);
            }
        }
    }, [businessData, minuteId, router, businessId, toast]);

    const handleSave = async () => {
        if (!businessId || !minuteId || !title || !date) {
            toast({ title: "Missing Information", description: "Title and date are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const result = await updateMeetingMinuteAction({
            businessId,
            minuteData: { id: minuteId, title, date, content }
        });
        setIsSaving(false);

        if (result.success) {
            toast({ title: "Minute Updated", description: "The meeting minute has been saved." });
            router.push(`/business/businesses/edit/${businessId}`);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    if (isLoading || !businessId) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href={`/business/businesses/edit/${businessId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Business Editor
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">Edit Meeting Minute</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Minute Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="minute-title">Title</Label>
                        <Input id="minute-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minute-date">Date</Label>
                        <DatePicker date={date} setDate={setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minute-content">Content</Label>
                        <RichTextEditor value={content} onChange={setContent} />
                    </div>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/business/businesses/edit/${businessId}`}>Cancel</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}


export default function EditMinutePage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <EditMinutePageContent />
        </React.Suspense>
    );
}
