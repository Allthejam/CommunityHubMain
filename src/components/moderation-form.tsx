
"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { filterInappropriateContent, type FilterInappropriateContentOutput } from "@/ai/flows/filter-inappropriate-content";
import { Loader2, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function ModerationForm() {
    const [textContent, setTextContent] = React.useState("");
    const [result, setResult] = React.useState<FilterInappropriateContentOutput | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const handleTestContent = async () => {
        if (!textContent.trim()) {
            toast({ title: "Content is empty", description: "Please enter some text to test.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setResult(null);
        try {
            const moderationResult = await filterInappropriateContent({ text: textContent });
            setResult(moderationResult);
        } catch (error) {
            console.error("Moderation test error:", error);
            toast({ title: "Error", description: "Could not test content.", variant: "destructive" });
        }
        setIsLoading(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test Content</CardTitle>
                <CardDescription>Enter text below to see if it would be flagged by the current AI moderation rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Enter text to test..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="min-h-[150px]"
                />
                <Button onClick={handleTestContent} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Test with AI
                </Button>
                {result && (
                    <Alert variant={result.isAppropriate ? "default" : "destructive"} className={result.isAppropriate ? "bg-green-50 border-green-200" : ""}>
                        {result.isAppropriate ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <AlertTitle>
                            {result.isAppropriate ? "Content is Appropriate" : "Content is Inappropriate"}
                        </AlertTitle>
                        <AlertDescription>
                            {result.reason || "The AI has determined this content aligns with community guidelines."}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
