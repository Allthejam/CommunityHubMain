'use server';

import { revalidatePath } from 'next/cache';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin-app';
import {
  DEFAULT_ABOUT_SEO_DATA,
  type AboutSectionKey,
  type AboutSeoData,
  type SeoPageMeta,
  type SeoSectionData,
} from '@/lib/seo/about-seo-defaults';
import {
  DEFAULT_PUBLIC_DIRECTORY_SEO_DATA,
  DEFAULT_SHOWCASE_SEO_DATA,
  mergePageSeoData,
  type PageSeoData,
  type SeoPageId,
} from '@/lib/seo/page-seo-defaults';

type SeoActionResult<T = PageSeoData<any>> = {
  success: boolean;
  data?: T;
  error?: string;
};

function getDefaultsAndRoute(pageId: SeoPageId): {
  defaults: PageSeoData<any>;
  route: string;
} {
  if (pageId === 'showcase') {
    return { defaults: DEFAULT_SHOWCASE_SEO_DATA, route: '/showcase' };
  }
  if (pageId === 'public-directory') {
    return { defaults: DEFAULT_PUBLIC_DIRECTORY_SEO_DATA, route: '/public-directory' };
  }
  return { defaults: DEFAULT_ABOUT_SEO_DATA, route: '/about' };
}

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

export async function getPageSeoDataAction<T extends PageSeoData<any> = PageSeoData<any>>(
  pageId: SeoPageId
): Promise<T> {
  const { defaults } = getDefaultsAndRoute(pageId);
  try {
    const { firestore } = initializeAdminApp();
    const snap = await firestore.collection('seoPages').doc(pageId).get();
    if (!snap.exists) {
      return defaults as T;
    }
    const raw = snap.data() as Partial<T>;
    return mergePageSeoData(defaults, raw) as T;
  } catch (err) {
    console.warn(`Error loading seoPages/${pageId} from Firestore, using defaults:`, err);
    return defaults as T;
  }
}

export async function getAboutSeoDataAction(): Promise<AboutSeoData> {
  return getPageSeoDataAction<AboutSeoData>('about');
}

export async function updatePageSeoMetaAction<T extends PageSeoData<any> = PageSeoData<any>>(params: {
  idToken: string;
  pageId: SeoPageId;
  meta: SeoPageMeta;
}): Promise<SeoActionResult<T>> {
  const authCheck = await verifySeoManager(params.idToken);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const { defaults, route } = getDefaultsAndRoute(params.pageId);

  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('seoPages').doc(params.pageId);
    const nowIso = new Date().toISOString();

    const cleanMeta: SeoPageMeta = {
      title: (params.meta.title || '').trim() || defaults.meta.title,
      description: (params.meta.description || '').trim() || defaults.meta.description,
      keywords: Array.isArray(params.meta.keywords)
        ? params.meta.keywords.map((k) => k.trim()).filter(Boolean)
        : defaults.meta.keywords,
      canonicalUrl: (params.meta.canonicalUrl || '').trim() || defaults.meta.canonicalUrl,
      robotsIndex: Boolean(params.meta.robotsIndex),
      robotsFollow: Boolean(params.meta.robotsFollow),
      ogTitle: (params.meta.ogTitle || '').trim() || params.meta.title || defaults.meta.ogTitle,
      ogDescription:
        (params.meta.ogDescription || '').trim() ||
        params.meta.description ||
        defaults.meta.ogDescription,
      ogImage: (params.meta.ogImage || '').trim() || defaults.meta.ogImage,
      ogImageAlt: (params.meta.ogImageAlt || '').trim() || defaults.meta.ogImageAlt,
      twitterTitle:
        (params.meta.twitterTitle || '').trim() ||
        params.meta.ogTitle ||
        params.meta.title ||
        defaults.meta.twitterTitle,
      twitterDescription:
        (params.meta.twitterDescription || '').trim() ||
        params.meta.ogDescription ||
        params.meta.description ||
        defaults.meta.twitterDescription,
      twitterImage:
        (params.meta.twitterImage || '').trim() ||
        params.meta.ogImage ||
        defaults.meta.twitterImage,
      schemaHeadline:
        (params.meta.schemaHeadline || '').trim() || defaults.meta.schemaHeadline,
      schemaDescription:
        (params.meta.schemaDescription || '').trim() || defaults.meta.schemaDescription,
      lastUpdatedLabel:
        (params.meta.lastUpdatedLabel || '').trim() || defaults.meta.lastUpdatedLabel,
    };

    await docRef.set(
      {
        pageId: params.pageId,
        route,
        meta: cleanMeta,
        updatedAt: nowIso,
        updatedBy: authCheck.email || authCheck.uid || 'seo-manager',
      },
      { merge: true }
    );

    const updatedSnap = await docRef.get();
    const merged = mergePageSeoData(defaults, updatedSnap.data() as Partial<T>) as T;

    revalidatePath(route);
    return { success: true, data: merged };
  } catch (err: any) {
    console.error(`Error updating ${params.pageId} SEO meta:`, err);
    return { success: false, error: err?.message || 'Failed to save SEO metadata.' };
  }
}

export async function updatePageSeoSectionAction<T extends PageSeoData<any> = PageSeoData<any>>(params: {
  idToken: string;
  pageId: SeoPageId;
  sectionKey: string;
  sectionData: SeoSectionData;
}): Promise<SeoActionResult<T>> {
  const authCheck = await verifySeoManager(params.idToken);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const { defaults, route } = getDefaultsAndRoute(params.pageId);

  if (!params.sectionKey || !(params.sectionKey in defaults.sections)) {
    return { success: false, error: 'Invalid section key.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('seoPages').doc(params.pageId);
    const nowIso = new Date().toISOString();
    const fallback = defaults.sections[params.sectionKey];

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
        pageId: params.pageId,
        route,
        sections: {
          [params.sectionKey]: cleanSection,
        },
        updatedAt: nowIso,
        updatedBy: authCheck.email || authCheck.uid || 'seo-manager',
      },
      { merge: true }
    );

    const updatedSnap = await docRef.get();
    const merged = mergePageSeoData(defaults, updatedSnap.data() as Partial<T>) as T;

    revalidatePath(route);
    return { success: true, data: merged };
  } catch (err: any) {
    console.error(`Error updating ${params.pageId} SEO section ${params.sectionKey}:`, err);
    return { success: false, error: err?.message || 'Failed to save section SEO data.' };
  }
}

export async function updateAboutSeoMetaAction(params: {
  idToken: string;
  meta: SeoPageMeta;
}): Promise<SeoActionResult<AboutSeoData>> {
  return updatePageSeoMetaAction<AboutSeoData>({
    idToken: params.idToken,
    pageId: 'about',
    meta: params.meta,
  });
}

export async function updateAboutSeoSectionAction(params: {
  idToken: string;
  sectionKey: AboutSectionKey;
  sectionData: SeoSectionData;
}): Promise<SeoActionResult<AboutSeoData>> {
  return updatePageSeoSectionAction<AboutSeoData>({
    idToken: params.idToken,
    pageId: 'about',
    sectionKey: params.sectionKey,
    sectionData: params.sectionData,
  });
}
