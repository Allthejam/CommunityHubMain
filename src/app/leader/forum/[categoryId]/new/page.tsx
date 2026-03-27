
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, Loader2 } from "lucide-react";
import * as React from "react";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { runCreateForumTopic } from "@/lib/actions/forumActions";
import { doc } from "firebase/firestore";

export default function NewTopicPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    
    const categoryId = params.categoryId as string;
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, `users/${user.uid}`) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const [title, setTitle] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleCreateTopic = async () => {
        if (!user || !userProfile) {
            toast({ title: "Not Authenticated", description: "You must be logged in to create a topic.", variant: "destructive" });
            return;
        }
        if (!title.trim() || !message.trim()) {
             toast({ title: "Missing Content", description: "Please provide a title and a message.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await runCreateForumTopic({
                categoryId,
                title,
                message,
                authorId: user.uid,
                authorName: userProfile.name,
                authorAvatar: userProfile.avatar || `https://i.pravatar.cc/150?u=${user.uid}`,
            });

            if (result.success && result.topicId) {
                toast({ title: "Topic Created!", description: "Your new topic has been posted." });
                router.push(`/leader/forum/${categoryId}/${result.topicId}`);
            } else {
                throw new Error(result.error || "An unknown error occurred.");
            }
        } catch (error) {
             toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href={`/leader/forum/${categoryId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Topics
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <PlusCircle className="h-8 w-8 text-primary" />
                    Create a New Topic
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>New Topic Details</CardTitle>
                    <CardDescription>Start a new discussion in this category.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic-title">Topic Title</Label>
                        <Input id="topic-title" placeholder="e.g., What's the best park for kids?" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="topic-message">Your Message</Label>
                        <Textarea id="topic-message" placeholder="Start your post here..." className="min-h-48" value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleCreateTopic} disabled={isSubmitting || isUserLoading}>
                        {(isSubmitting || isUserLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Topic
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
