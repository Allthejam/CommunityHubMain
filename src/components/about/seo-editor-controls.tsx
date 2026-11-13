'use client';

import * as React from 'react';
import { doc } from 'firebase/firestore';
import {
  Pencil,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Upload,
  Globe,
  Tag,
  Image as ImageIcon,
  Type,
  CheckCircle2,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadImageAction } from '@/lib/actions/storageActions';
import {
  updateAboutSeoMetaAction,
  updateAboutSeoSectionAction,
} from '@/lib/actions/seoActions';
import type {
  AboutSectionKey,
  AboutSeoData,
  HeadingLevel,
  SeoPageMeta,
  SeoSectionData,
} from '@/lib/seo/about-seo-defaults';

export function useIsSeoManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<any>(userProfileRef);

  const isSeoManager = Boolean(
    user &&
      userProfile &&
      (userProfile.permissions?.isSeoManager === true ||
        userProfile.accountType === 'owner' ||
        userProfile.role === 'owner')
  );

  return {
    isSeoManager,
    user,
    isLoading: isUserLoading || profileLoading,
  };
}

export function SeoHeading({
  tag,
  className,
  children,
}: {
  tag: HeadingLevel;
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = tag || 'h2';
  return <Tag className={className}>{children}</Tag>;
}

export function SeoEditPencil({
  label,
  tagHint,
  onClick,
  className = '',
}: {
  label: string;
  tagHint?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Edit SEO: ${label}`}
      aria-label={`Edit SEO: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/70 bg-amber-500/95 px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-all z-20 ${className}`}
    >
      <Pencil className="h-3 w-3" />
      <span>{tagHint ? `${label} (${tagHint.toUpperCase()})` : label}</span>
    </button>
  );
}

export function SeoManagerBar({
  seoData,
  showPencils,
  onTogglePencils,
  onOpenMetaEditor,
}: {
  seoData: AboutSeoData;
  showPencils: boolean;
  onTogglePencils: () => void;
  onOpenMetaEditor: () => void;
}) {
  return (
    <div className="sticky top-16 z-30 mb-6 rounded-2xl border border-amber-500/40 bg-slate-950/95 text-slate-100 p-3 sm:px-5 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 flex-wrap">
        <Badge className="bg-amber-500 text-slate-950 font-bold text-xs gap-1">
          <Sparkles className="h-3 w-3" />
          SEO Manager Mode
        </Badge>
        <span className="text-xs text-slate-300">
          Click any pencil icon below to edit headings (H1–H6), copy, images, or ALT tags live.
        </span>
        {seoData.updatedAt && (
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Saved {new Date(seoData.updatedAt).toLocaleDateString('en-GB')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onTogglePencils}
          className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
        >
          {showPencils ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPencils ? 'Preview as Visitor' : 'Show Edit Pencils'}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onOpenMetaEditor}
          className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Page Meta &amp; Keywords
        </Button>
      </div>
    </div>
  );
}

export function SeoMetaEditorDialog({
  open,
  onOpenChange,
  meta,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: SeoPageMeta;
  onSaved: (updated: AboutSeoData) => void;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const [form, setForm] = React.useState<SeoPageMeta>(meta);
  const [keywordsText, setKeywordsText] = React.useState(meta.keywords.join(', '));
  const [saving, setSaving] = React.useState(false);
  const [uploadingOg, setUploadingOg] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(meta);
      setKeywordsText(meta.keywords.join(', '));
    }
  }, [open, meta]);

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingOg(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const res = await uploadImageAction({
          base64Data,
          path: `seo/about/og-${Date.now()}-${safeName}`,
        });
        if (res.success && res.url) {
          setForm((prev) => ({
            ...prev,
            ogImage: res.url!,
            twitterImage: res.url!,
          }));
          toast({ title: 'Image uploaded', description: 'OpenGraph & Twitter image URL updated.' });
        } else {
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: res.error || 'Could not upload image.',
          });
        }
        setUploadingOg(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload error', description: err?.message });
      setUploadingOg(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const keywords = keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await updateAboutSeoMetaAction({
        idToken,
        meta: {
          ...form,
          keywords,
        },
      });

      if (res.success && res.data) {
        onSaved(res.data);
        onOpenChange(false);
        toast({
          title: 'Page SEO Metadata Saved',
          description: 'Live meta title, description, keywords, and OpenGraph tags updated.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: res.error || 'Could not save SEO metadata.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Unexpected error saving metadata.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-500" />
            Edit Page-Level SEO &amp; Metadata (`/about`)
          </DialogTitle>
          <DialogDescription>
            Controls what Google, Screaming Frog, and social media previews see in the page &lt;head&gt;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-meta-title">Meta Title</Label>
              <span
                className={`text-[11px] font-mono ${
                  form.title.length > 65 ? 'text-amber-600' : 'text-muted-foreground'
                }`}
              >
                {form.title.length} / 60 chars recommended
              </span>
            </div>
            <Input
              id="seo-meta-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-meta-desc">Meta Description</Label>
              <span
                className={`text-[11px] font-mono ${
                  form.description.length > 165 ? 'text-amber-600' : 'text-muted-foreground'
                }`}
              >
                {form.description.length} / 160 chars recommended
              </span>
            </div>
            <Textarea
              id="seo-meta-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seo-keywords" className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Keywords (comma-separated)
            </Label>
            <Textarea
              id="seo-keywords"
              rows={2}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="community hub, local business directory, digital high street..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="seo-canonical">Canonical URL</Label>
              <Input
                id="seo-canonical"
                value={form.canonicalUrl}
                onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seo-last-updated">Page Last Updated Label</Label>
              <Input
                id="seo-last-updated"
                value={form.lastUpdatedLabel}
                onChange={(e) => setForm({ ...form, lastUpdatedLabel: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Switch
                id="seo-robots-index"
                checked={form.robotsIndex}
                onCheckedChange={(checked) => setForm({ ...form, robotsIndex: checked })}
              />
              <Label htmlFor="seo-robots-index" className="text-xs cursor-pointer">
                Allow Search Indexing (`index`)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="seo-robots-follow"
                checked={form.robotsFollow}
                onCheckedChange={(checked) => setForm({ ...form, robotsFollow: checked })}
              />
              <Label htmlFor="seo-robots-follow" className="text-xs cursor-pointer">
                Allow Link Crawling (`follow`)
              </Label>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              OpenGraph &amp; Social Share Preview
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="seo-og-title">OpenGraph Title</Label>
              <Input
                id="seo-og-title"
                value={form.ogTitle}
                onChange={(e) => setForm({ ...form, ogTitle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seo-og-desc">OpenGraph Description</Label>
              <Textarea
                id="seo-og-desc"
                rows={2}
                value={form.ogDescription}
                onChange={(e) => setForm({ ...form, ogDescription: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="seo-og-image">OpenGraph Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="seo-og-image"
                    value={form.ogImage}
                    onChange={(e) => setForm({ ...form, ogImage: e.target.value })}
                  />
                  <label className="inline-flex items-center justify-center rounded-md border px-3 text-xs font-medium cursor-pointer hover:bg-muted shrink-0">
                    {uploadingOg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleOgImageUpload}
                      disabled={uploadingOg}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seo-og-alt">OpenGraph Image ALT Text</Label>
                <Input
                  id="seo-og-alt"
                  value={form.ogImageAlt}
                  onChange={(e) => setForm({ ...form, ogImageAlt: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Schema.org JSON-LD (Google Rich Results)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="seo-schema-headline">Schema Headline</Label>
              <Input
                id="seo-schema-headline"
                value={form.schemaHeadline}
                onChange={(e) => setForm({ ...form, schemaHeadline: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seo-schema-desc">Schema Description</Label>
              <Textarea
                id="seo-schema-desc"
                rows={2}
                value={form.schemaDescription}
                onChange={(e) => setForm({ ...form, schemaDescription: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Page SEO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SeoSectionEditorDialog({
  open,
  onOpenChange,
  sectionKey,
  sectionLabel,
  sectionData,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: AboutSectionKey | null;
  sectionLabel: string;
  sectionData: SeoSectionData | null;
  onSaved: (updated: AboutSeoData) => void;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const [form, setForm] = React.useState<SeoSectionData | null>(sectionData);
  const [saving, setSaving] = React.useState(false);
  const [uploadingImg, setUploadingImg] = React.useState(false);

  React.useEffect(() => {
    if (open && sectionData) {
      setForm(sectionData);
    }
  }, [open, sectionData]);

  if (!form || !sectionKey) return null;

  const hasImage = form.imageUrl !== undefined;
  const hasBadge = form.badge !== undefined;
  const hasDescription = form.description !== undefined;
  const hasSecondary = form.secondaryDescription !== undefined;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const res = await uploadImageAction({
          base64Data,
          path: `seo/about/${sectionKey}-${Date.now()}-${safeName}`,
        });
        if (res.success && res.url) {
          setForm((prev) => (prev ? { ...prev, imageUrl: res.url! } : prev));
          toast({
            title: 'Image uploaded',
            description: 'Remember to verify the ALT text matches the new image!',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: res.error || 'Could not upload image.',
          });
        }
        setUploadingImg(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload error', description: err?.message });
      setUploadingImg(false);
    }
  };

  const handleSave = async () => {
    if (!user || !sectionKey || !form) return;
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const res = await updateAboutSeoSectionAction({
        idToken,
        sectionKey,
        sectionData: form,
      });

      if (res.success && res.data) {
        onSaved(res.data);
        onOpenChange(false);
        toast({
          title: `${sectionLabel} Updated`,
          description: 'Changes saved to Firestore and live on /about.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: res.error || 'Could not save section SEO.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Unexpected error saving section.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-amber-500" />
            Edit Section SEO: {sectionLabel}
          </DialogTitle>
          <DialogDescription>
            Update heading level (H1–H6), heading copy, section text, and image ALT attributes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Heading Tag</Label>
              <Select
                value={form.headingTag}
                onValueChange={(val) => setForm({ ...form, headingTag: val as HeadingLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1 (Main Title)</SelectItem>
                  <SelectItem value="h2">H2 (Section)</SelectItem>
                  <SelectItem value="h3">H3 (Sub-section)</SelectItem>
                  <SelectItem value="h4">H4 (Card/Group)</SelectItem>
                  <SelectItem value="h5">H5 (Minor)</SelectItem>
                  <SelectItem value="h6">H6 (Small)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <Label htmlFor="sec-heading">Heading Text</Label>
              <Input
                id="sec-heading"
                value={form.heading}
                onChange={(e) => setForm({ ...form, heading: e.target.value })}
              />
            </div>
          </div>

          {hasBadge && (
            <div className="space-y-1.5">
              <Label htmlFor="sec-badge">Badge / Eyebrow Label</Label>
              <Input
                id="sec-badge"
                value={form.badge || ''}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
              />
            </div>
          )}

          {hasDescription && (
            <div className="space-y-1.5">
              <Label htmlFor="sec-desc">Section Copy / Description</Label>
              <Textarea
                id="sec-desc"
                rows={4}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          )}

          {hasSecondary && (
            <div className="space-y-1.5">
              <Label htmlFor="sec-desc2">Secondary Copy / Sub-heading</Label>
              <Textarea
                id="sec-desc2"
                rows={3}
                value={form.secondaryDescription || ''}
                onChange={(e) => setForm({ ...form, secondaryDescription: e.target.value })}
              />
            </div>
          )}

          {hasImage && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Image &amp; Google Images SEO
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="sec-img-url">Image URL (or upload new)</Label>
                <div className="flex gap-2">
                  <Input
                    id="sec-img-url"
                    value={form.imageUrl || ''}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  />
                  <label className="inline-flex items-center justify-center rounded-md border px-3 text-xs font-medium cursor-pointer hover:bg-muted shrink-0 gap-1">
                    {uploadingImg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImg}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sec-img-alt">Image ALT Text (used by Google Images &amp; screen readers)</Label>
                <Input
                  id="sec-img-alt"
                  value={form.imageAlt || ''}
                  onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
                  placeholder="Describe the image clearly with relevant local keywords..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sec-img-title">Image Title Attribute (optional hover/SEO hint)</Label>
                <Input
                  id="sec-img-title"
                  value={form.imageTitle || ''}
                  onChange={(e) => setForm({ ...form, imageTitle: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
