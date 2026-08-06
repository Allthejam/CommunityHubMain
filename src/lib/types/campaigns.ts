export type CampaignCategory = 
  | 'transport' 
  | 'banking_services' 
  | 'community_facilities' 
  | 'environment' 
  | 'healthcare' 
  | 'other';

export type CampaignStatus = 'active' | 'closed' | 'victory' | 'draft';

export interface Campaign {
  id: string;
  communityId: string;
  title: string;
  description: string;
  category: CampaignCategory;
  status: CampaignStatus;
  creatorId?: string;
  creatorName?: string;
  targetSignatures: number;
  currentSignatures: number;
  signedUserIds?: string[];
  isPinned?: boolean;
  createdAt?: any;
  updatedAt?: any;
  endDate?: any;
  victoryNotice?: string;
}
