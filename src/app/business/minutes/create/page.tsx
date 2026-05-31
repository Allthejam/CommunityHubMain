
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { RichTextEditor } from '@/components/rich-text-editor';
import { addMeetingMinuteAction } from '@/lib/actions/businessActions';

function CreateMinutePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const businessId = searchParams.get('businessId');
    const { toast } = useToast();

    const [title, setTitle] = React.useState('');
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [content, setContent] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (!businessId || !title || !date) {
            toast({ title: "Missing Information", description: "Business context, title, and date are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const result = await addMeetingMinuteAction({
            businessId,
            minuteData: { title, date, content }
        });
        setIsSaving(false);

        if (result.success) {
            toast({ title: "Minute Created", description: "The new meeting minute has been saved." });
            router.push(`/business/businesses/edit/${businessId}`);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    if (!businessId) {
        return (
            <div className="text-center">
                <p>Business ID is missing. Please go back and try again.</p>
                <Button asChild variant="link">
                    <Link href="/business/listings">Go to My Businesses</Link>
                </Button>
            </div>
        );
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
                <h1 className="text-3xl font-bold">Add New Meeting Minute</h1>
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
                        Save Minute
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/business/businesses/edit/${businessId}`}>Cancel</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function CreateMinutePage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CreateMinutePageContent />
        </React.Suspense>
    );
}
