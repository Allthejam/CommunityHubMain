

export type NotificationType = 
  | "Event Request" 
  | "Business Submission" 
  | "General Inquiry" 
  | "News Story Submission" 
  | "Partnership Request" 
  | "New Message" 
  | "New Report" 
  | "Leadership Invitation" 
  | "Special Access Request" 
  | "Leader Information Update" 
  | "Boundary Dispute" 
  | "Leadership Application" 
  | "Advertiser Profile"
  | "New Community"
  | "Lost & Found Report"
  | "Advert Approval Request"
  | "Charity Application"
  | "Account Update"
  | "Police Liaison Application"
  | "Community Milestone"
  | "New Order"
  | "Order Update"
  | "Team Invitation"
  | "Courier Application"
  | "Emergency Plan Update"
  | "Situation Bulletin"
  | "Community Announcement"
  | "Poll Alert"
  | "Petition Alert"
  | "Public Emergency Alert";

export type NotificationStatus = 'new' | 'read' | 'archived' | 'actioned' | 'assigned' | 'complete' | 'reassigned' | 'New' | 'Read' | 'Archived' | 'Actioned' | 'Assigned' | 'Complete' | 'Reassigned';

export type Notification = {
  id: string;
  type: NotificationType;
  subject: string;
  from: string;
  date: string | any;
  status: NotificationStatus;
  recipientId: string;
  relatedId?: string;
  actionUrl?: string;
  readAt?: any;
  lastInteractedAt?: any;
  details?: {
    reportingCommunityId?: string;
    overlappingCommunityId?: string;
    communityId?: string;
    communityName?: string;
    declineReason?: string;
    bulletinSeverity?: string;
    hazardType?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
  history?: {
    action: string;
    actor: string;
    timestamp: any;
  }[];
};
