'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import { Store, Loader2, Sparkles, Moon, Sun, CloudRain } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function ShoppingSettingsPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [highstreetEffect, setHighstreetEffect] = useState('none');
    const [highstreetLighting, setHighstreetLighting] = useState('auto');

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityId = (userProfile as any)?.impersonating?.communityId || userProfile?.communityId;

    const communityProfileRef = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return doc(db, 'community_profiles', communityId);
    }, [communityId, db]);
    
    const { data: communityProfileData, isLoading: communityProfileLoading } = useDoc(communityProfileRef);

    useEffect(() => {
        if (communityProfileData) {
            setHighstreetEffect(communityProfileData.highstreetEffect || 'none');
            setHighstreetLighting(communityProfileData.highstreetLighting || 'auto');
        }
    }, [communityProfileData]);

    const handleSave = async () => {
        if (!communityId || !db) return;
        setIsSaving(true);
        try {
            const ref = doc(db, 'community_profiles', communityId);
            await updateDoc(ref, {
                highstreetEffect,
                highstreetLighting
            });
            toast({
                title: "Settings Saved",
                description: "The High Street graphics have been updated for your community.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save settings.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (profileLoading || communityProfileLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Store className="h-8 w-8" />
                    High Street Graphics
                </h1>
                <p className="text-muted-foreground mt-2">
                    Control the visual experience of your community's local High Street shopping page.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" /> 
                        Seasonal Visual Effects
                    </CardTitle>
                    <CardDescription>
                        Choose an animated overlay to display on the High Street. This effect will be visible to all users browsing local shops.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="effect-select">Active Effect</Label>
                        <Select value={highstreetEffect} onValueChange={setHighstreetEffect}>
                            <SelectTrigger id="effect-select" className="w-[300px]">
                                <SelectValue placeholder="Select an effect" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Clear (No Effect)</SelectItem>
                                <SelectItem value="snow">🥶 Winter Snow</SelectItem>
                                <SelectItem value="halloween">🎃 Halloween Pumpkins</SelectItem>
                                <SelectItem value="summer">☀️ Summer Beach</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Moon className="h-5 w-5 text-primary" /> 
                        Lighting & Ambiance
                    </CardTitle>
                    <CardDescription>
                        Set the time of day for the High Street background. Auto mode will match the user's local device time.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid gap-2">
                        <Label htmlFor="lighting-select">Lighting Mode</Label>
                        <Select value={highstreetLighting} onValueChange={setHighstreetLighting}>
                            <SelectTrigger id="lighting-select" className="w-[300px]">
                                <SelectValue placeholder="Select lighting" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto (Matches User's Time)</SelectItem>
                                <SelectItem value="day">Always Day</SelectItem>
                                <SelectItem value="night">Always Night</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/50 py-4 border-t flex justify-end">
                     <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Graphical Settings
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
