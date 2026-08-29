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

export type EmergencyMessageLevel = 'info' | 'advisory' | 'warning' | 'critical' | 'allclear';

export interface EmergencyMessage {
  id: string;
  communityId: string;
  title: string;
  body: string;
  level: EmergencyMessageLevel;
  hazardCategory: string;
  authorName: string;
  authorRole: string;
  authorId: string;
  createdAt: any;
  isActive: boolean;
  retractedAt?: any;
  retractedBy?: string;
  retractReason?: string;
}

export type EmergencyAuditActionType =
  | 'PLAN_SAVE'
  | 'BULLETIN_PUBLISH'
  | 'BULLETIN_RETRACT'
  | 'BULLETIN_ARCHIVE'
  | 'STAND_DOWN'
  | 'FAILOVER_TOGGLE'
  | 'CERTIFICATION_SIGN'
  | 'LSO_ENDORSEMENT'
  | 'THREAT_CHANGE'
  | 'VOLUNTEER_REGISTER';

export interface EmergencyAuditLogEntry {
  id?: string;
  communityId: string;
  actionType: EmergencyAuditActionType;
  category: string;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  actorId: string;
  summary: string;
  details?: any;
  timestamp?: any;
}

export type ScenarioFacilitiesMap = Record<
  string,
  {
    f1: ScenarioFacilityItem;
    f2: ScenarioFacilityItem;
    f3: ScenarioFacilityItem;
  }
>;

export interface WildfireHazardArea {
  id: string;
  title: string;
  fuelType: string;
  windThreat: string;
  notes?: string;
}

export interface WildfireContactItem {
  id: string;
  role: string;
  name: string;
  telephone: string;
  notes?: string;
}

export interface WildfireTimelineStage {
  id: string;
  timeTag: string; // e.g. "T+0 MINS", "T+15 MINS"
  title: string;
  desc: string;
}

export interface WildfireSafeguardingItem {
  id: string;
  title: string;
  description: string;
  category?: 'protocol' | 'hfsv' | 'custom';
}

export interface WildfireAssetItem {
  id: string;
  category: string; // e.g. "Machinery", "Water Point", "Transport", "Pasture", "Equipment"
  name: string;
  description: string;
}

export interface KeyholderItem {
  id: string;
  facilityOrAsset: string; // e.g. "Community Hall / Rest Centre", "Fire Hydrant Standpipes & Keys", "Estate Access Gates"
  category: string; // e.g. "Building / Shelter", "Hydrants & Standpipes", "Estate Gates", "Equipment / Generator", "Sandbag Store"
  primaryName: string;
  primaryPhone: string;
  backupName?: string;
  backupPhone?: string;
  keyLocationNotes?: string; // e.g. "Key safe on wall code 1234; spare key held by caretaker"
}

export interface ScenarioLiaisonItem {
  id: string;
  role: string; // e.g. "SFRS Fire Station Command", "SEPA Flood Warning Officer", "SSEN Grid Lead"
  agencyOrName: string; // e.g. "Grantown Community Fire Station (SFRS)", "SEPA North Command"
  telephone: string;
  notes?: string;
}

export type ScenarioLiaisonsMap = Record<string, ScenarioLiaisonItem[]>;

export interface ScenarioTimelineStage {
  id: string;
  timeTag: string; // e.g. "T+00 MINS", "T+15 MINS", "T+30 MINS", "T+60 MINS", "T+2 HOURS"
  title: string;
  desc: string;
}

export type ScenarioTimelinesMap = Record<string, ScenarioTimelineStage[]>;

export interface IncidentSopTask {
  id: string;
  title: string;
  desc: string;
  role?: string;
  shortcutAction?: 'announcement' | 'threat' | 'bulletin' | 'keyholders' | 'volunteers' | 'none';
  isCompleted?: boolean;
  completedAt?: any;
  completedBy?: string;
}

export interface IncidentSopPhase {
  id: string;
  timeTag: string;
  title: string;
  desc: string;
  tasks: IncidentSopTask[];
}

export interface EmergencyPlanData {
  communityId: string;
  townshipName: string;
  updatedAt?: any;
  updatedBy?: string;

  // Incident Commander Standard Operating Procedure (SOP) & Pocket Checklist
  incidentSop?: IncidentSopPhase[];

  // Living Plan Statutory Audit & Verification Lifecycle
  lastReviewedAt?: any;
  reviewedByName?: string;
  reviewedByRole?: string;
  nextReviewDueAt?: any;
  sfrsPriorityAlignment?: string; // e.g. "SFRS Priority 2: Wildfire & Climate Resilience"
  lsoEndorsement?: {
    endorsed: boolean;
    serviceName?: string;
    officerName?: string;
    endorsedAt?: any;
    comments?: string;
  };

  // Keyholders & Infrastructure Access Register
  keyholdersList?: KeyholderItem[];

  // Scenario-Specific Multi-Agency Liaisons Map
  scenarioLiaisons?: ScenarioLiaisonsMap;

  // Dynamic Operational Response Timelines per Hazard
  timelinesMap?: ScenarioTimelinesMap;

  // Dynamic Wildfire Sections (Multi-item support with Add / Delete)
  wildfireHazardAreas?: WildfireHazardArea[];
  wildfireAssetList?: WildfireAssetItem[];
  wildfireContactList?: WildfireContactItem[];
  wildfireTimelineStages?: WildfireTimelineStage[];
  wildfireSafeguardingList?: WildfireSafeguardingItem[];

  // Wildfire Specialized Contacts Matrix (Fallback / Legacy)
  wildfireContacts?: {
    coordinatorName?: string;
    coordinatorTel?: string;
    estateManagerName?: string;
    estateManagerTel?: string;
    headKeeperName?: string;
    headKeeperTel?: string;
    fireStationName?: string;
    fireStationTel?: string;
  };

  // SFRS Community Asset Register (Machinery & Water Abstraction)
  wildfireAssets?: {
    firebreakTractors?: string;
    waterAbstractionPoints?: string;
    bowsersAndATVs?: string;
    livestockPastures?: string;
  };

  // Public Visibility & Threat State
  isPublicOnAboutPage?: boolean;
  currentThreatStatus?: 'normal' | 'advisory' | 'incident';
  activeHazardScenario?: 'wildfire' | 'urbanfire' | 'flood' | 'power' | 'drought' | 'unrest' | 'defence';

  // Scenario-Specific Infrastructure & Facilities Map (Unique to each Annexe)
  scenarioFacilities?: ScenarioFacilitiesMap;

  // Scenario-Specific Operational Notes & Guidance (Unique per scenario)
  scenarioNotes?: Record<string, string>;

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

  // Additional Information & Rich Notes (e.g. Volunteer Notes, Local Protocols)
  additionalNotesHtml?: string;

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
  userName?: string;
  contactName?: string;
  operatorName?: string;
  userEmail: string;
  phone: string;
  skills: string[];
  equipmentNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, communityId, userName, contactName, operatorName, userEmail, phone, skills, equipmentNotes } = params;

  if (!userId || !communityId) {
    return { success: false, error: 'User ID and Community ID are required.' };
  }

  const primaryName = contactName?.trim() || userName?.trim() || 'Local Resident';

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
        userName: primaryName,
        contactName: primaryName,
        operatorName: operatorName?.trim() || '',
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

/**
 * Formally certifies and stamps the Emergency Resilience Plan as reviewed and current for a 6-month cycle.
 */
export async function certifyEmergencyPlanAction(params: {
  communityId: string;
  reviewerName: string;
  reviewerRole?: string;
  userId: string;
}): Promise<{ success: boolean; error?: string; reviewedAt?: string; nextReviewDueAt?: string }> {
  const { communityId, reviewerName, reviewerRole, userId } = params;

  if (!communityId || !reviewerName) {
    return { success: false, error: 'Community ID and Reviewer Name are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');

    const now = Timestamp.now();
    // 6 months in milliseconds (~182.5 days)
    const sixMonthsMs = 182.5 * 24 * 60 * 60 * 1000;
    const nextDue = Timestamp.fromMillis(now.toMillis() + sixMonthsMs);

    await planRef.set(
      {
        lastReviewedAt: now,
        reviewedByName: reviewerName,
        reviewedByRole: reviewerRole || 'Community Leader / Resilience Coordinator',
        nextReviewDueAt: nextDue,
        updatedAt: now,
        updatedBy: userId,
      },
      { merge: true }
    );

    return {
      success: true,
      reviewedAt: now.toDate().toISOString(),
      nextReviewDueAt: nextDue.toDate().toISOString(),
    };
  } catch (error: any) {
    console.error('Error certifying emergency plan:', error);
    return { success: false, error: error.message || 'Failed to certify emergency plan.' };
  }
}

/**
 * Allows a verified emergency services liaison officer (e.g. SFRS LSO) to digitally endorse the plan.
 */
export async function endorseEmergencyPlanAction(params: {
  communityId: string;
  serviceName: string;
  officerName: string;
  comments?: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { communityId, serviceName, officerName, comments, userId } = params;

  if (!communityId || !officerName) {
    return { success: false, error: 'Community ID and Officer Name are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');

    await planRef.set(
      {
        lsoEndorsement: {
          endorsed: true,
          serviceName: serviceName || 'Scottish Fire and Rescue Service',
          officerName,
          comments: comments || 'Plan reviewed and verified against local emergency service protocols.',
          endorsedAt: Timestamp.now(),
        },
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error endorsing emergency plan:', error);
    return { success: false, error: error.message || 'Failed to endorse emergency plan.' };
  }
}

/**
 * Appends an immutable entry to the Community Emergency Audit Log.
 */
export async function logEmergencyAuditAction(params: EmergencyAuditLogEntry): Promise<{ success: boolean; error?: string }> {
  const { communityId, actionType, category, actorName, actorEmail, actorRole, actorId, summary, details } = params;
  const safeActorId = actorId || 'leader';

  if (!communityId || !actionType) {
    return { success: false, error: 'Community ID and Action Type are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const auditColRef = firestore.collection('communities').doc(communityId).collection('emergency_audit_logs');

    await auditColRef.add({
      communityId,
      actionType,
      category: category || 'General',
      actorName: actorName || 'Community Resilience Leader',
      actorEmail: actorEmail || '',
      actorRole: actorRole || 'Leader / Official',
      actorId: safeActorId,
      summary: summary || actionType,
      details: details || {},
      timestamp: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error recording emergency audit log:', error);
    return { success: false, error: error.message || 'Failed to record audit log.' };
  }
}

/**
 * Publishes an official emergency situation message / bulletin to the public portal and records in audit.
 */
export async function publishEmergencyMessageAction(params: {
  communityId: string;
  title: string;
  body: string;
  level: EmergencyMessageLevel;
  hazardCategory: string;
  authorName: string;
  authorRole?: string;
  authorId: string;
  authorEmail?: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const { communityId, title, body, level, hazardCategory, authorName, authorRole, authorId, authorEmail } = params;

  if (!communityId || !title || !body || !authorId) {
    return { success: false, error: 'Community, title, message content, and author are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const now = Timestamp.now();
    const messagesCol = firestore.collection('communities').doc(communityId).collection('emergency_messages');

    const messageDoc = await messagesCol.add({
      communityId,
      title,
      body,
      level: level || 'advisory',
      hazardCategory: hazardCategory || 'general',
      authorName: authorName || 'Incident Commander',
      authorRole: authorRole || 'Community Resilience Leader',
      authorId,
      createdAt: now,
      isActive: true,
    });

    // Update main emergency plan document with active official notice
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');
    await planRef.set(
      {
        officialNotice: {
          isActive: true,
          headline: title,
          message: body,
          level: level || 'advisory',
          hazardCategory: hazardCategory || 'general',
          authorName: authorName || 'Incident Commander',
          authorRole: authorRole || 'Community Resilience Leader',
          publishedAt: now,
          messageId: messageDoc.id,
        },
        currentThreatStatus: level === 'critical' ? 'incident' : level === 'warning' ? 'advisory' : 'normal',
        updatedAt: now,
        updatedBy: authorId,
      },
      { merge: true }
    );

    // Record in Audit Log
    await logEmergencyAuditAction({
      communityId,
      actionType: 'BULLETIN_PUBLISH',
      category: hazardCategory || 'Emergency Notice',
      actorName: authorName || 'Incident Commander',
      actorEmail: authorEmail || '',
      actorRole: authorRole || 'Leader / Incident Commander',
      actorId: authorId,
      summary: `Published Live ${level.toUpperCase()} Bulletin: "${title}"`,
      details: { title, level, hazardCategory, messageId: messageDoc.id },
    });

    return { success: true, messageId: messageDoc.id };
  } catch (error: any) {
    console.error('Error publishing emergency message:', error);
    return { success: false, error: error.message || 'Failed to publish emergency message.' };
  }
}

/**
 * Retracts / archives an active emergency situation bulletin and clears official notice.
 */
export async function retractEmergencyMessageAction(params: {
  communityId: string;
  messageId?: string;
  authorName: string;
  authorRole?: string;
  authorId: string;
  authorEmail?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { communityId, messageId, authorName, authorRole, authorId, authorEmail, reason } = params;

  if (!communityId || !authorId) {
    return { success: false, error: 'Community ID and Author ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const now = Timestamp.now();

    // If a specific messageId was provided, mark it inactive
    if (messageId) {
      const msgRef = firestore.collection('communities').doc(communityId).collection('emergency_messages').doc(messageId);
      await msgRef.set(
        {
          isActive: false,
          retractedAt: now,
          retractedBy: authorId,
          retractReason: reason || 'Notice retracted / situation normalized.',
        },
        { merge: true }
      );
    }

    // Clear official notice on main plan document
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');
    await planRef.set(
      {
        officialNotice: {
          isActive: false,
          headline: '',
          message: '',
          retractedAt: now,
          retractedBy: authorName,
        },
        currentThreatStatus: 'normal',
        updatedAt: now,
        updatedBy: authorId,
      },
      { merge: true }
    );

    // Record in Audit Log
    await logEmergencyAuditAction({
      communityId,
      actionType: 'BULLETIN_RETRACT',
      category: 'Emergency Notice',
      actorName: authorName || 'Incident Commander',
      actorEmail: authorEmail || '',
      actorRole: authorRole || 'Leader / Incident Commander',
      actorId: authorId,
      summary: `Retracted Active Bulletin. Reason: ${reason || 'Situation Normalized'}`,
      details: { messageId, reason },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error retracting emergency message:', error);
    return { success: false, error: error.message || 'Failed to retract emergency message.' };
  }
}

/**
 * Archives a specific emergency message with a custom archive reason and records in audit.
 */
export async function archiveEmergencyMessageAction(params: {
  communityId: string;
  messageId: string;
  authorName: string;
  authorRole?: string;
  authorId: string;
  authorEmail?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { communityId, messageId, authorName, authorRole, authorId, authorEmail, reason } = params;

  if (!communityId || !messageId || !authorId) {
    return { success: false, error: 'Community ID, Message ID, and Author ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const now = Timestamp.now();
    const msgRef = firestore.collection('communities').doc(communityId).collection('emergency_messages').doc(messageId);
    
    await msgRef.set(
      {
        isActive: false,
        archivedAt: now,
        archivedBy: authorId,
        archivedByName: authorName,
        archiveReason: reason || 'Bulletin archived by incident commander.',
      },
      { merge: true }
    );

    // If this was the active official notice on main doc, clear it
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');
    const planDoc = await planRef.get();
    if (planDoc.exists) {
      const pData = planDoc.data();
      if (pData?.officialNotice?.messageId === messageId) {
        await planRef.set(
          {
            officialNotice: {
              isActive: false,
              headline: '',
              message: '',
              archivedAt: now,
              archivedBy: authorName,
            },
            currentThreatStatus: 'normal',
            updatedAt: now,
            updatedBy: authorId,
          },
          { merge: true }
        );
      }
    }

    // Record in Audit Log
    await logEmergencyAuditAction({
      communityId,
      actionType: 'BULLETIN_ARCHIVE',
      category: 'Emergency Notice Archive',
      actorName: authorName || 'Incident Commander',
      actorEmail: authorEmail || '',
      actorRole: authorRole || 'Leader / Incident Commander',
      actorId: authorId,
      summary: `Archived Emergency Bulletin: ${messageId}. Reason: ${reason || 'Archived'}`,
      details: { messageId, reason },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error archiving emergency message:', error);
    return { success: false, error: error.message || 'Failed to archive emergency message.' };
  }
}

/**
 * Executes a full Incident Stand Down:
 * 1. Archives ALL currently active emergency bulletins to the permanent audit log.
 * 2. Optionally issues a final 🟢 All-Clear / Stand-Down bulletin to residents.
 * 3. De-escalates threat readiness back to Normal (Green).
 * 4. Stamped in the immutable statutory audit log.
 */
export async function standDownEmergencyAndArchiveBulletinsAction(params: {
  communityId: string;
  authorName: string;
  authorRole?: string;
  authorId: string;
  authorEmail?: string;
  issueAllClearNotice: boolean;
  allClearTitle?: string;
  allClearBody?: string;
  hazardCategory?: string;
}): Promise<{ success: boolean; error?: string; archivedCount?: number }> {
  const {
    communityId,
    authorName,
    authorRole,
    authorId,
    authorEmail,
    issueAllClearNotice,
    allClearTitle,
    allClearBody,
    hazardCategory
  } = params;

  if (!communityId || !authorId) {
    return { success: false, error: 'Community ID and Author ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const now = Timestamp.now();
    const messagesCol = firestore.collection('communities').doc(communityId).collection('emergency_messages');

    // 1. Fetch all active bulletins
    const activeSnapshot = await messagesCol.where('isActive', '==', true).get();
    let archivedCount = 0;

    const batch = firestore.batch();

    activeSnapshot.docs.forEach((docSnap) => {
      batch.set(
        docSnap.ref,
        {
          isActive: false,
          archivedAt: now,
          archivedBy: authorId,
          archivedByName: authorName,
          archiveReason: 'Emergency Incident Stood Down & Archived for Compliance Audit',
        },
        { merge: true }
      );
      archivedCount++;
    });

    await batch.commit();

    // 2. If requested, publish a single final 🟢 All-Clear / Stand-Down Bulletin
    let newAllClearMsgId: string | undefined;
    const finalTitle = allClearTitle?.trim() || '🟢 ALL CLEAR: Emergency Incident Stood Down';
    const finalBody =
      allClearBody?.trim() ||
      'Official Stand-Down: All active emergency cordons and measures have stood down. Community response operations have concluded and facilities are returning to normal schedule.';

    if (issueAllClearNotice) {
      const allClearDoc = await messagesCol.add({
        communityId,
        title: finalTitle,
        body: finalBody,
        level: 'allclear',
        hazardCategory: hazardCategory || 'general',
        authorName: authorName || 'Incident Commander',
        authorRole: authorRole || 'Community Resilience Leader',
        authorId,
        createdAt: now,
        isActive: true,
      });
      newAllClearMsgId = allClearDoc.id;
    }

    // 3. Update main emergency plan document
    const planRef = firestore.collection('communities').doc(communityId).collection('emergency_plan').doc('main');
    await planRef.set(
      {
        officialNotice: issueAllClearNotice
          ? {
              isActive: true,
              headline: finalTitle,
              message: finalBody,
              level: 'allclear',
              hazardCategory: hazardCategory || 'general',
              authorName: authorName || 'Incident Commander',
              authorRole: authorRole || 'Community Resilience Leader',
              publishedAt: now,
              messageId: newAllClearMsgId,
            }
          : {
              isActive: false,
              headline: '',
              message: '',
              level: 'allclear',
              retractedAt: now,
              retractedBy: authorName,
            },
        currentThreatStatus: 'normal',
        lastThreatUpdate: now,
        lastThreatUpdatedBy: authorId,
        updatedAt: now,
        updatedBy: authorId,
      },
      { merge: true }
    );

    // 4. Log immutable entry in Emergency Audit Log
    await logEmergencyAuditAction({
      communityId,
      actionType: 'STAND_DOWN',
      category: 'Incident Closure',
      actorName: authorName || 'Incident Commander',
      actorEmail: authorEmail || '',
      actorRole: authorRole || 'Leader / Incident Commander',
      actorId: authorId,
      summary: `Incident Stood Down: ${archivedCount} active bulletin(s) archived.${issueAllClearNotice ? ' Final All-Clear Notice published.' : ''}`,
      details: {
        archivedCount,
        issueAllClearNotice,
        allClearTitle: issueAllClearNotice ? finalTitle : null,
        hazardCategory: hazardCategory || 'general',
      },
    });

    return { success: true, archivedCount };
  } catch (error: any) {
    console.error('Error standing down emergency and archiving bulletins:', error);
    return { success: false, error: error.message || 'Failed to stand down emergency.' };
  }
}

