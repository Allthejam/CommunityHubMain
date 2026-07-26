export interface PetitionComment {
  id: string;
  author: string;
  role: 'Admin' | 'Resident';
  text: string;
  time: string;
}

export type PetitionStatus = 'active' | 'closed' | 'draft' | 'paused';
export type PetitionCategory = 'council' | 'amenities' | 'safety' | 'other';

export interface Petition {
  id: string;
  communityId: string;
  title: string;
  description: string;
  category: PetitionCategory;
  status: PetitionStatus;
  creator: string;
  createdOn: string;
  targetSignatures: number;
  signaturesCount: number;
  /** Stores the UIDs of users who have signed — prevents signing multiple times */
  signedBy: string[];
  comments: PetitionComment[];
  endDate?: any;
}
