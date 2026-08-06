export interface PollComment {
  id: string;
  author: string;
  role: 'Admin' | 'Resident';
  text: string;
  time: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export type PollStatus = 'active' | 'closed' | 'draft' | 'paused';
export type PollCategory = 'budget' | 'events' | 'feedback' | 'regulations';

export interface Poll {
  id: string;
  communityId: string;
  title: string;
  description: string;
  category: PollCategory;
  status: PollStatus;
  creator: string;
  createdOn: string;
  options: PollOption[];
  comments: PollComment[];
  /** Stores the UIDs of users who have already voted — prevents double-voting */
  votedBy?: string[];
  endDate?: any;
}
