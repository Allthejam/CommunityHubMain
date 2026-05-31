

export type Announcement = {
  id: string;
  subject: string;
  message: string;
  image?: string | null;
  type: 'Standard' | 'Emergency';
  severity?: 'normal' | 'urgent';
  status: 'Live' | 'Scheduled' | 'Paused' | 'Archived';
  audience: {
    type: 'location';
    countries: string[];
    states: string[];
    regions: string[];
    communities: string[];
  };
  scheduledDates: string;
  sentBy: string;
  scope: 'platform' | 'community';
  communityId?: string;
  communityName?: string;
  createdAt: any; // Firestore Timestamp
  startDate?: any; // Firestore Timestamp
  endDate?: any;
  ownerId?: string;
  history?: {
    status: string;
    timestamp: any; // Firestore Timestamp
    actorId: string;
  }[];
};
