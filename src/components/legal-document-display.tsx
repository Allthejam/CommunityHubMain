
'use client';

import * as React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

type LegalDocumentDisplayProps = {
  documentId: string;
};

type LegalDocument = {
  title: string;
  content: string;
  status: 'Published' | 'Draft' | 'Archived';
  version: string;
  lastUpdated: { toDate: () => Date };
};

export function LegalDocumentDisplay({ documentId }: LegalDocumentDisplayProps) {
  const db = useFirestore();
  const docRef = useMemoFirebase(() => (db ? doc(db, 'legal_documents', documentId) : null), [db, documentId]);
  const { data: document, isLoading } = useDoc<LegalDocument>(docRef);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Document Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested document could not be found.</p>
        </CardContent>
      </Card>
    );
  }

  if (document.status !== 'Published') {
    return (
      <Card>
        <CardHeader className="items-center text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-4"/>
          <CardTitle>Content Coming Soon</CardTitle>
          <CardDescription>
            This document is currently being drafted and will be available here shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="h-5 w-5"/>
            {document.title}
        </CardTitle>
        <CardDescription className="text-xs">
          Version {document.version} | Last updated: {format(document.lastUpdated.toDate(), 'PPP')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: document.content }}
        />
      </CardContent>
    </Card>
  );
}
