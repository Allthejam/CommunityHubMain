'use server';

import { revalidatePath } from 'next/cache';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin-app';
import {
  DEFAULT_ABOUT_SEO_DATA,
  mergeAboutSeoData,
  type AboutSectionKey,
  type AboutSeoData,
  type SeoPageMeta,
  type SeoSectionData,
} from '@/lib/seo/about-seo-defaults';

type SeoActionResult = {
  success: boolean;
  data?: AboutSeoData;
  error?: string;
};

async function verifySeoManager(idToken: string): Promise<{
  authorized: boolean;
  email?: string;
  uid?: string;
  error?: string;
}> {
  if (!idToken) {
    return { authorized: false, error: 'Authentication token is required.' };
  }

  try {
    const { adminApp, firestore } = initializeAdminApp();
    const decoded = await getAuth(adminApp).verifyIdToken(idToken);
    const uid = decoded.uid;

    const userSnap = await firestore.collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;

    const isAllowed =
      userData?.permissions?.isSeoManager === true ||
      userData?.accountType === 'owner' ||
      userData?.role === 'owner';

    if (!isAllowed) {
      return {
        authorized: false,
        error: 'Unauthorized: SEO Manager or Owner permission is required.',
      };
    }

    return {
      authorized: true,
      uid,
      email: decoded.email || userData?.email || uid,
    };
  } catch (err: any) {
    console.error('SEO Manager verification failed:', err);
    return {
      authorized: false,
      error: err?.message || 'Failed to verify SEO Manager credentials.',
    };
  }
}

export async function getAboutSeoDataAction(): Promise<AboutSeoData> {
  try {
    const { firestore } = initializeAdminApp();
    const snap = await firestore.collection('seoPages').doc('about').get();
    if (!snap.exists) {
      return DEFAULT_ABOUT_SEO_DATA;
    }
    const raw = snap.data() as Partial<AboutSeoData>;
    return mergeAboutSeoData(raw);
  } catch (err) {
    console.warn('Error loading seoPages/about from Firestore, using defaults:', err);
    return DEFAULT_ABOUT_SEO_DATA;
  }
}

export async function updateAboutSeoMetaAction(params: {
  idToken: string;
  meta: SeoPageMeta;
}): Promise<SeoActionResult> {
  const authCheck = await verifySeoManager(params.idToken);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('seoPages').doc('about');
    const nowIso = new Date().toISOString();

    const cleanMeta: SeoPageMeta = {
      title: (params.meta.title || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.title,
      description: (params.meta.description || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.description,
      keywords: Array.isArray(params.meta.keywords)
        ? params.meta.keywords.map((k) => k.trim()).filter(Boolean)
        : DEFAULT_ABOUT_SEO_DATA.meta.keywords,
      canonicalUrl:
        (params.meta.canonicalUrl || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.canonicalUrl,
      robotsIndex: Boolean(params.meta.robotsIndex),
      robotsFollow: Boolean(params.meta.robotsFollow),
      ogTitle: (params.meta.ogTitle || '').trim() || params.meta.title || DEFAULT_ABOUT_SEO_DATA.meta.ogTitle,
      ogDescription:
        (params.meta.ogDescription || '').trim() ||
        params.meta.description ||
        DEFAULT_ABOUT_SEO_DATA.meta.ogDescription,
      ogImage: (params.meta.ogImage || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.ogImage,
      ogImageAlt: (params.meta.ogImageAlt || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.ogImageAlt,
      twitterTitle:
        (params.meta.twitterTitle || '').trim() ||
        params.meta.ogTitle ||
        params.meta.title ||
        DEFAULT_ABOUT_SEO_DATA.meta.twitterTitle,
      twitterDescription:
        (params.meta.twitterDescription || '').trim() ||
        params.meta.ogDescription ||
        params.meta.description ||
        DEFAULT_ABOUT_SEO_DATA.meta.twitterDescription,
      twitterImage:
        (params.meta.twitterImage || '').trim() ||
        params.meta.ogImage ||
        DEFAULT_ABOUT_SEO_DATA.meta.twitterImage,
      schemaHeadline:
        (params.meta.schemaHeadline || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.schemaHeadline,
      schemaDescription:
        (params.meta.schemaDescription || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.schemaDescription,
      lastUpdatedLabel:
        (params.meta.lastUpdatedLabel || '').trim() || DEFAULT_ABOUT_SEO_DATA.meta.lastUpdatedLabel,
    };

    await docRef.set(
      {
        pageId: 'about',
        route: '/about',
        meta: cleanMeta,
        updatedAt: nowIso,
        updatedBy: authCheck.email || authCheck.uid || 'seo-manager',
      },
      { merge: true }
    );

    const updatedSnap = await docRef.get();
    const merged = mergeAboutSeoData(updatedSnap.data() as Partial<AboutSeoData>);

    revalidatePath('/about');
    return { success: true, data: merged };
  } catch (err: any) {
    console.error('Error updating About SEO meta:', err);
    return { success: false, error: err?.message || 'Failed to save SEO metadata.' };
  }
}

export async function updateAboutSeoSectionAction(params: {
  idToken: string;
  sectionKey: AboutSectionKey;
  sectionData: SeoSectionData;
}): Promise<SeoActionResult> {
  const authCheck = await verifySeoManager(params.idToken);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  if (!params.sectionKey || !(params.sectionKey in DEFAULT_ABOUT_SEO_DATA.sections)) {
    return { success: false, error: 'Invalid section key.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('seoPages').doc('about');
    const nowIso = new Date().toISOString();
    const fallback = DEFAULT_ABOUT_SEO_DATA.sections[params.sectionKey];

    const validTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
    const headingTag = validTags.includes(params.sectionData.headingTag)
      ? params.sectionData.headingTag
      : fallback.headingTag;

    const cleanSection: SeoSectionData = {
      heading: (params.sectionData.heading || '').trim() || fallback.heading,
      headingTag,
    };

    if (params.sectionData.badge !== undefined || fallback.badge !== undefined) {
      cleanSection.badge = (params.sectionData.badge ?? fallback.badge ?? '').trim();
    }
    if (params.sectionData.description !== undefined || fallback.description !== undefined) {
      cleanSection.description = (params.sectionData.description ?? fallback.description ?? '').trim();
    }
    if (
      params.sectionData.secondaryDescription !== undefined ||
      fallback.secondaryDescription !== undefined
    ) {
      cleanSection.secondaryDescription = (
        params.sectionData.secondaryDescription ??
        fallback.secondaryDescription ??
        ''
      ).trim();
    }
    if (params.sectionData.imageUrl !== undefined || fallback.imageUrl !== undefined) {
      cleanSection.imageUrl = (params.sectionData.imageUrl ?? fallback.imageUrl ?? '').trim();
    }
    if (params.sectionData.imageAlt !== undefined || fallback.imageAlt !== undefined) {
      cleanSection.imageAlt = (params.sectionData.imageAlt ?? fallback.imageAlt ?? '').trim();
    }
    if (params.sectionData.imageTitle !== undefined || fallback.imageTitle !== undefined) {
      cleanSection.imageTitle = (params.sectionData.imageTitle ?? fallback.imageTitle ?? '').trim();
    }

    await docRef.set(
      {
        pageId: 'about',
        route: '/about',
        sections: {
          [params.sectionKey]: cleanSection,
        },
        updatedAt: nowIso,
        updatedBy: authCheck.email || authCheck.uid || 'seo-manager',
      },
      { merge: true }
    );

    const updatedSnap = await docRef.get();
    const merged = mergeAboutSeoData(updatedSnap.data() as Partial<AboutSeoData>);

    revalidatePath('/about');
    return { success: true, data: merged };
  } catch (err: any) {
    console.error(`Error updating About SEO section ${params.sectionKey}:`, err);
    return { success: false, error: err?.message || 'Failed to save section SEO data.' };
  }
}
