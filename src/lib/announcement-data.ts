
export type Announcement = {
  id: string;
  subject: string;
  message: string;
  image?: string | null;
  type: 'Standard' | 'Emergency';
  severity?: 'normal' | 'urgent';
  status: 'Live' | 'Scheduled' | 'Paused' | 'Archived';
  audience: string[] | string;
  scheduledDates: string;
  sentBy: string;
  scope: 'platform' | 'community';
  communityId?: string;
  communityName?: string;
  createdAt: any; // Firestore Timestamp
  startDate?: any; // Firestore Timestamp
  endDate?: any
};
