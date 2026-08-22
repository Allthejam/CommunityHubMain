'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';
import { createCommunityAnnouncementAction } from './announcementActions';

export interface ScenarioFacilityItem {
  name: string;
  category?: string;
  primary: string;
  secondary: string;
  isFailover: boolean;
  notes?: string;
}

export type ScenarioFacilitiesMap = Record<
  string,
  {
    f1: ScenarioFacilityItem;
    f2: ScenarioFacilityItem;
    f3: ScenarioFacilityItem;
  }
>;

export interface EmergencyPlanData {
  communityId: string;
  townshipName: string;
  updatedAt?: any;
  updatedBy?: string;

  // Public Visibility & Threat State
  isPublicOnAboutPage?: boolean;
  currentThreatStatus?: 'normal' | 'advisory' | 'incident';
  activeHazardScenario?: 'wildfire' | 'urbanfire' | 'flood' | 'power' | 'drought' | 'unrest' | 'defence';

  // Scenario-Specific Infrastructure & Facilities Map (Unique to each Annexe)
  scenarioFacilities?: ScenarioFacilitiesMap;

  // Official Situation Bulletin / Leader Noticeboard (One-way official verified notice)
  officialNotice?: {
    headline: string;
    message: string;
    updatedAt?: any;
    issuedBy?: string;
    isActive: boolean;
  };

  // Global Infrastructure & Facilities (Fallback / Legacy)
  primaryHq?: string;
  secondaryHq?: string;
  primaryHub?: string;
  secondaryHub?: string;
  primaryRoute?: string;
  secondaryRoute?: string;

  // Active Failover States (Legacy)
  failovers?: {
    command: boolean;
    hub: boolean;
    route: boolean;
  };

  // Hazard Priorities Map
  priorities: Record<
    string,
    {
      p1Title: string;
      p1Desc: string;
      p2Title: string;
      p2Desc: string;
      p3Title: string;
      p3Desc: string;
    }
  >;

  // Hazard Timelines Map
  timelines: Record<
    string,
    {
      t0Title: string;
      t0Desc: string;
      t15Title: string;
      t15Desc: string;
      t30Title: string;
      t30Desc: string;
      t60Title: string;
      t60Desc: string;
    }
  >;

  // Hazard 1: Wildfire
  wildfire: {
    fuels: string;
    windThreat: string;
    escapePrimary: string;
    escapeSecondary: string;
    hydrants: string;
    waterPoint: string;
    livestockGrounds: string;
  };

  // Hazard 2: Urban Fire
  urbanfire: {
    riskBlocks: string;
    cordonDist: string;
    bypassRoute: string;
    warmthHub: string;
  };

  // Hazard 3: Flood & Surge
  flood: {
    river: string;
    sepaCode: string;
    sandbagLoc: string;
    sandbagTel: string;
    highGround: string;
  };

  // Hazard 4: Power Outage
  power: {
    triggerHours: string;
    warmHours: string;
    radioRepeater: string;
    generatorSpecs: string;
  };

  // Hazard 5: Water Shortage & Drought
  drought: {
    pwsCount: string;
    bowserLoc: string;
    hoseType: string;
    bottledHub: string;
    livestockWater: string;
  };

  // Hazard 6: Civil Unrest
  unrest: {
    avoidArea: string;
    policeLiaison: string;
  };

  // Hazard 7: Civil Defence & State Emergency
  defence: {
    waterSpring: string;
    shelterLoc: string;
  };

  // Community Capability, Asset & Equipment Inventory
  assets: {
    fourByFourCount: string;
    chainsaws: string;
    generators: string;
    radios: string;
    heavyTractors: string;
    argocatsQuads: string;
  };

  // Communications & Redundancy
  comms: {
    hamPmrFreq: string;
    noticeboardLocs: string;
  };
}

export async function saveEmergencyPlanAction(
  communityId: string,
  planData: Partial<EmergencyPlanData>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!communityId) {
    return { success: false, error: 'Community ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');

    await planRef.set(
      {
        ...planData,
        communityId,
        updatedAt: Timestamp.now(),
        updatedBy: userId || 'system',
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error saving emergency plan:', error);
    return { success: false, error: error.message || 'Failed to save emergency plan.' };
  }
}

export async function getEmergencyPlanAction(
  communityId: string
): Promise<{ success: boolean; data?: EmergencyPlanData; error?: string }> {
  if (!communityId) {
    return { success: false, error: 'Community ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const planDoc = await firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main').get();

    if (planDoc.exists) {
      return { success: true, data: planDoc.data() as EmergencyPlanData };
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    console.error('Error fetching emergency plan:', error);
    return { success: false, error: error.message || 'Failed to fetch emergency plan.' };
  }
}

/**
 * Updates only the live threat status and official situation notice independently from the statutory plan.
 */
export async function updateLiveThreatStatusAction(params: {
  communityId: string;
  threatStatus: 'normal' | 'advisory' | 'incident';
  activeHazardScenario: 'wildfire' | 'urbanfire' | 'flood' | 'power' | 'drought' | 'unrest' | 'defence';
  officialNotice?: {
    headline: string;
    message: string;
    issuedBy?: string;
    isActive: boolean;
  };
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { communityId, threatStatus, activeHazardScenario, officialNotice, userId } = params;

  if (!communityId) {
    return { success: false, error: 'Community ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');

    await planRef.set(
      {
        currentThreatStatus: threatStatus,
        activeHazardScenario,
        officialNotice:
          threatStatus === 'normal'
            ? {
                isActive: false,
                headline: '',
                message: '',
                issuedBy: officialNotice?.issuedBy || '',
                updatedAt: Timestamp.now(),
              }
            : officialNotice
            ? {
                ...officialNotice,
                isActive: true,
                updatedAt: Timestamp.now(),
              }
            : {
                isActive: false,
                headline: '',
                message: '',
                updatedAt: Timestamp.now(),
              },
        lastThreatUpdate: Timestamp.now(),
        lastThreatUpdatedBy: userId || 'leader',
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error updating live threat status:', error);
    return { success: false, error: error.message || 'Failed to update threat status.' };
  }
}

/**
 * Publishes an emergency broadcast strictly to the active community members.
 */
export async function publishCommunityEmergencyBroadcastAction(params: {
  userId: string;
  communityId: string;
  subject: string;
  message: string;
  sentBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, communityId, subject, message, sentBy } = params;

  if (!communityId || !subject || !message) {
    return { success: false, error: 'Missing required broadcast parameters.' };
  }

  try {
    const result = await createCommunityAnnouncementAction({
      userId,
      communityId,
      subject,
      message,
      image: null,
      type: 'Emergency',
      severity: 'urgent',
      status: 'Live',
      scheduledDates: '',
      startDate: new Date(),
      endDate: null,
      sentBy,
      sendEmail: true,
    });

    return result;
  } catch (error: any) {
    console.error('Error broadcasting emergency alert:', error);
    return { success: false, error: error.message || 'Failed to dispatch broadcast.' };
  }
}

/**
 * Allows a community resident to volunteer their skills, equipment, and assets for civil emergencies.
 */
export async function registerResilienceVolunteerAction(params: {
  userId: string;
  communityId: string;
  userName: string;
  userEmail: string;
  phone: string;
  skills: string[];
  equipmentNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, communityId, userName, userEmail, phone, skills, equipmentNotes } = params;

  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const volunteerRef = firestore
      .collection('communities')
      .doc(communityId)
      .collection('resilience_volunteers')
      .doc(userId);

    await volunteerRef.set(
      {
        userId,
        communityId,
        userName: userName || 'Local Resident',
        userEmail: userEmail || '',
        phone: phone || '',
        skills: skills || [],
        equipmentNotes: equipmentNotes || '',
        registeredAt: Timestamp.now(),
      },
      { merge: true }
    );

    // Also update user profile flag
    await firestore.collection('users').doc(userId).set(
      {
        isResilienceVolunteer: true,
        resilienceSkills: skills || [],
        resilienceCommunityId: communityId,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error registering resilience volunteer:', error);
    return { success: false, error: error.message || 'Failed to register as volunteer.' };
  }
}
