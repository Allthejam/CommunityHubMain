
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessagesSquare, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";

type ForumCategory = {
  id: string;
  name: string;
  description: string;
  topics: number;
  posts: number;
  communityId: string;
};


export default function ForumPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);

    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const categoriesQuery = useMemoFirebase(() => {
        if (!userProfile?.communityId || !db) return null;
        return query(collection(db, "forum-categories"), where("communityId", "==", userProfile.communityId));
    }, [db, userProfile?.communityId]);

    const { data: categories, isLoading: dataLoading } = useCollection<ForumCategory>(categoriesQuery);
    
    const loading = authLoading || profileLoading || dataLoading;

    if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <MessagesSquare className="h-8 w-8 text-primary" />
                    Community Forum
                </h1>
                <p className="text-muted-foreground">
                    Discuss topics with other members of the community.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Browse the different discussion areas below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Category</TableHead>
                                <TableHead className="text-center">Topics</TableHead>
                                <TableHead className="text-center">Posts</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories && categories.length > 0 ? (
                                categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                                                <div>
                                                    <Link href={`/forum/${category.id}`} className="font-medium hover:underline">{category.name}</Link>
                                                    <p className="text-sm text-muted-foreground">{category.description}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{category.topics || 0}</TableCell>
                                        <TableCell className="text-center">{category.posts || 0}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No forum categories have been created for this community yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
