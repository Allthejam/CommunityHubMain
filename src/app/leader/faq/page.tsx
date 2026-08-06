
"use client";

import * as React from "react";
import {
    MoreHorizontal,
    PlusCircle,
    Loader2,
    Trash2,
    Save,
    Eye,
    EyeOff,
    HelpCircle,
    GripVertical,
    Pencil,
    X,
    Sparkles,
} from "lucide-react"
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { doc } from 'firebase/firestore';
import { runCreateFaq, runUpdateFaq, runDeleteFaq, runUpdateFaqOrder, runToggleFaqVisibility } from "@/lib/actions/faqActions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/rich-text-editor";
import { runProofreadText, type ProofreadTextOutput } from '@/lib/actions/newsActions';
import { ScrollArea } from "@/components/ui/scroll-area";


export type FaqItem = {
    id: string;
    question: string;
    answer: string;
    order: number;
    showOnHomepage: boolean;
};

export default function LeaderFaqPage() {
    const { user } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const [faqItems, setFaqItems] = React.useState<FaqItem[]>([]);
    const [faqPublished, setFaqPublished] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    
    const [newQuestion, setNewQuestion] = React.useState('');
    const [newAnswer, setNewAnswer] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<Partial<FaqItem> | null>(null);
    const [currentQuestion, setCurrentQuestion] = React.useState("");
    const [currentAnswer, setCurrentAnswer] = React.useState("");
    const [isProofreading, setIsProofreading] = React.useState(false);
    const [proofreadData, setProofreadData] = React.useState<ProofreadTextOutput | null>(null);
    
    const { toast } = useToast();

    const communityId = userProfile?.communityId;

    React.useEffect(() => {
        if (!communityId || !db) {
            setLoading(false);
            return;
        };

        const communityRef = doc(db, "communities", communityId);
        const unsubCommunity = onSnapshot(communityRef, (doc) => {
            setFaqPublished(doc.data()?.faqPublished || false);
        });

        const q = query(
            collection(db, "communities", communityId, "faqs"),
            orderBy("order", "asc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FaqItem));
            setFaqItems(items);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            unsubCommunity();
        };
    }, [communityId, db]);

    const handleOpenDialog = (item: Partial<FaqItem> | null = null) => {
        setEditingItem(item);
        setCurrentQuestion(item?.question || "");
        setCurrentAnswer(item?.answer || "");
        setProofreadData(null);
        setIsDialogOpen(true);
    };

    const handleSaveItem = async () => {
        if (!communityId) return;
        if (!currentQuestion.trim() || !currentAnswer.trim()) {
            toast({ title: 'Missing fields', description: 'Question and answer cannot be empty.', variant: 'destructive'});
            return;
        }

        setIsSaving(true);
        try {
            if (editingItem?.id) {
                const result = await runUpdateFaq({ communityId, id: editingItem.id, question: currentQuestion, answer: currentAnswer });
                if (!result.success) throw new Error(result.error);
            } else {
                 const result = await runCreateFaq({ communityId, question: currentQuestion, answer: currentAnswer });
                if (!result.success) throw new Error(result.error);
            }
            toast({ title: 'Success', description: `FAQ item ${editingItem?.id ? 'updated' : 'created'}.`});
            setIsDialogOpen(false);
        } catch(error) {
            toast({ title: 'Error saving item', description: (error as Error).message, variant: 'destructive'});
        } finally {
            setIsSaving(false);
        }
    };

    const handleProofread = async () => {
        if (!currentAnswer) return;
        setIsProofreading(true);
        const result = await runProofreadText({ text: currentAnswer });
        setProofreadData(result);
        setIsProofreading(false);
    };
    
    const handleAcceptProofread = () => {
        if (proofreadData) {
            setCurrentAnswer(proofreadData.proofreadText);
            setProofreadData(null);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!communityId) return;
        if (!confirm('Are you sure you want to delete this FAQ?')) return;
        const result = await runDeleteFaq({ communityId, id });
        if (!result.success) {
            toast({ title: 'Error Deleting', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'FAQ Deleted' });
        }
    }

    const handlePublishToggle = async (isPublished: boolean) => {
        if (!communityId) return;
        setIsSaving(true);
        const result = await runToggleFaqVisibility({ communityId, isPublished });
        if (result.success) {
            toast({ title: 'Visibility Updated', description: `FAQ page is now ${isPublished ? 'visible' : 'hidden'}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    }
    
    return (
    <>
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <HelpCircle className="h-8 w-8" />
                    Manage FAQs
                </h1>
                <p className="text-muted-foreground">
                    Create and manage the Frequently Asked Questions for your community page.
                </p>
            </div>

             <div className="flex items-center space-x-2">
                <Switch
                    id="faq-published"
                    checked={faqPublished}
                    onCheckedChange={handlePublishToggle}
                    disabled={isSaving}
                />
                <Label htmlFor="faq-published" className="text-sm font-medium">FAQ Page Published</Label>
            </div>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>FAQ Items</CardTitle>
                        <CardDescription>Manage the questions and answers for your community.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New FAQ
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : faqItems.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {faqItems.map((item) => (
                                <AccordionItem key={item.id} value={item.id}>
                                    <AccordionTrigger className="hover:no-underline text-left">
                                       <div className="flex items-center gap-2 flex-1">
                                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                            <span className="text-left font-semibold">{item.question}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-8">
                                         <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.answer }} />
                                         <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                                                <Pencil className="h-4 w-4 mr-2" /> Edit
                                            </Button>
                                             <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </Button>
                                         </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                         <div className="text-center py-12 text-muted-foreground">
                            <p>No FAQs created yet. Click "Add New FAQ" to get started.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-2xl grid grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[90vh]">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{editingItem?.id ? "Edit" : "Add"} FAQ Item</DialogTitle>
                </DialogHeader>
                 <ScrollArea className="h-auto">
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="question">Question</Label>
                            <Input id="question" value={currentQuestion} onChange={(e) => setCurrentQuestion(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="answer">Answer</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleProofread} disabled={isProofreading}>
                                    {isProofreading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Proofread with AI
                                </Button>
                            </div>
                            <RichTextEditor value={currentAnswer} onChange={setCurrentAnswer} placeholder="Provide the answer here..." />
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-4 border-t">
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveItem} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={!!proofreadData} onOpenChange={() => setProofreadData(null)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> AI Proofreading Suggestions</DialogTitle>
                    <DialogDescription>The AI has reviewed your text and suggested the following improvements.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto p-1">
                    <div className="space-y-4">
                         <h3 className="font-semibold">Suggestions</h3>
                         <ul className="space-y-2 text-sm list-disc pl-5 text-muted-foreground">
                            {proofreadData?.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold">Revised Text</h3>
                        <div className="p-4 border rounded-md bg-secondary/50 max-h-96 overflow-y-auto text-sm"
                            dangerouslySetInnerHTML={{ __html: proofreadData?.proofreadText || "" }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAcceptProofread}>Accept Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
