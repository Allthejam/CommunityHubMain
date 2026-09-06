'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, FileDown, Printer, ArrowLeft, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LegalDocumentDisplay } from '@/components/legal-document-display';
import { generateComplianceBriefHtml } from '@/lib/compliance-pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function Iso22301EmergencyBriefPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const townshipName = userProfile?.communityName || userProfile?.homeCommunityName || 'Local Community Resilience Network';

  const handleDownloadPdf = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Pop-up Blocked',
          description: 'Please allow pop-ups for this site to generate the ISO 22301 Auditor Brief PDF.',
          variant: 'destructive',
        });
        return;
      }

      const html = generateComplianceBriefHtml({
        townshipName,
        communityId: userProfile?.communityId,
        generatedDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      });

      printWindow.document.write(html);
      printWindow.document.close();

      toast({
        title: '🖨️ Generating Auditor Defence Brief',
        description: 'Formatted multi-page ISO 22301 compliance report ready for print/PDF export.',
      });
    } catch (e: any) {
      console.error('Error generating PDF:', e);
      toast({
        title: 'Export Failed',
        description: e.message || 'Could not generate compliance document.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4 px-2 sm:px-4">
      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/home">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <a href="/documents/iso-22301-auditor-brief.pdf" download="ISO-22301-Auditor-Brief.pdf">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-md cursor-pointer"
            >
              <FileDown className="h-4 w-4" /> Download Official PDF
            </Button>
          </a>

          <Button
            onClick={handleDownloadPdf}
            variant="outline"
            size="sm"
            className="border-sky-500/50 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950 font-bold gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" /> Generate Custom PDF
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Printer className="h-4 w-4" /> Print Document
          </Button>
        </div>
      </div>

      {/* Hero Banner Card */}
      <Card className="border-2 border-sky-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/40 text-white shadow-xl overflow-hidden">
        <CardHeader className="p-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/50 font-mono text-[11px] uppercase tracking-wider px-2.5 py-0.5">
              ISO 22301:2019 Clause 8.4 Aligned
            </Badge>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[11px] font-mono">
              Auditor Defence Brief
            </Badge>
            <Badge variant="outline" className="text-amber-400 border-amber-500/40 text-[11px] font-mono">
              Reference: O9VcW8oF4GxbSLzuiQSI
            </Badge>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-sky-400 shrink-0" />
            ISO 22301 Graceful Degradation Architecture &amp; Auditor Brief
          </CardTitle>
          <CardDescription className="text-sm text-slate-300 mt-2">
            Official statutory governance notice detailing multi-tier graceful degradation, physical contingency runbooks, and limitation of service disclaimers for civil protection auditors, emergency planning officers, and town councils.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Document Body */}
      <Card className="border shadow-lg bg-card">
        <CardContent className="p-6 sm:p-10">
          <LegalDocumentDisplay documentId="O9VcW8oF4GxbSLzuiQSI" />
        </CardContent>
      </Card>

      {/* Bottom Footer Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground p-4 bg-muted/30 rounded-xl border">
        <p>Document Ref: <span className="font-mono font-semibold">O9VcW8oF4GxbSLzuiQSI</span> • Published on Community Hub Legal Registry</p>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <Link href="/about" className="hover:underline">About Us</Link>
          <Link href="/leader/emergency-plan" className="hover:underline text-primary">Emergency Planning Console</Link>
        </div>
      </div>
    </div>
  );
}
