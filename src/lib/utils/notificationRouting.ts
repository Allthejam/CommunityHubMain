import { type Notification } from '@/lib/types/notifications';

/**
 * Resolves the destination URL for any given notification.
 * Handles specific targets for Public Emergency Plans, Situation Bulletins,
 * Events, Announcements, Polls, Messages, Reports, and Business Orders.
 */
export function getNotificationDestination(notification: Notification, isLeader = false): string {
  if (notification.actionUrl && notification.actionUrl.trim() !== '' && notification.actionUrl !== '#') {
    return notification.actionUrl;
  }

  const communityId = notification.details?.communityId || 'c_showhome';
  const type = notification.type || '';
  const subject = (notification.subject || '').toLowerCase();
  const from = (notification.from || '').toLowerCase();

  // 1. Emergency Resilience Plan, Incident Bulletins, Disaster Alerts
  if (
    type === 'Emergency Plan Update' ||
    type === 'Situation Bulletin' ||
    type === 'Public Emergency Alert' ||
    subject.includes('emergency') ||
    subject.includes('resilience') ||
    subject.includes('bulletin') ||
    subject.includes('sop') ||
    subject.includes('wildfire') ||
    subject.includes('flood') ||
    subject.includes('power outage') ||
    subject.includes('threat') ||
    subject.includes('advisory') ||
    from.includes('resilience') ||
    from.includes('emergency')
  ) {
    if (isLeader) {
      return '/leader/emergency-plan';
    }
    return `/community/${communityId}/emergency`;
  }

  // 2. Community Announcements & Push Broadcasts
  if (
    type === 'Community Announcement' ||
    subject.includes('announcement') ||
    subject.includes('broadcast')
  ) {
    if (isLeader) {
      return '/leader/announcements';
    }
    return `/community/${communityId}/feed`;
  }

  // 3. Events & Calendar Requests
  if (
    type === 'Event Request' ||
    subject.includes('event') ||
    subject.includes('festival') ||
    subject.includes('meeting')
  ) {
    if (isLeader) {
      return '/leader/events';
    }
    return notification.relatedId ? `/events/${notification.relatedId}` : `/community/${communityId}/feed`;
  }

  // 4. Polls & Petitions
  if (type === 'Poll Alert' || subject.includes('poll')) {
    if (isLeader) return '/leader/polls';
    return notification.relatedId ? `/polls/${notification.relatedId}` : `/community/${communityId}/feed`;
  }
  if (type === 'Petition Alert' || subject.includes('petition')) {
    if (isLeader) return '/leader/campaigns';
    return notification.relatedId ? `/petitions/${notification.relatedId}` : `/community/${communityId}/feed`;
  }

  // 5. News Story Submissions
  if (type === 'News Story Submission' || subject.includes('news') || subject.includes('article')) {
    if (isLeader) return '/leader/news';
    return notification.relatedId ? `/news/${notification.relatedId}` : `/community/${communityId}/feed`;
  }

  // 6. Businesses & Shop Orders
  if (type === 'Business Submission' || subject.includes('business')) {
    return isLeader ? '/leader/businesses' : `/businesses/${notification.relatedId || ''}`;
  }
  if (type === 'New Order' || type === 'Order Update' || subject.includes('order')) {
    return '/business/orders';
  }

  // 7. Messages & Direct Support Chat
  if (type === 'New Message') {
    if (notification.subject.includes('Platform Support')) {
      return `/leader/chat?conversationId=${notification.relatedId || ''}`;
    }
    if (notification.from === 'Platform Administration') {
      return `/admin/staff-chat?conversationId=${notification.relatedId || ''}`;
    }
    return `/chat?conversationId=${notification.relatedId || ''}`;
  }

  // 8. Moderation & Leader Roles
  if (type === 'Leadership Application' || type === 'Leadership Invitation') {
    return '/leader/applications';
  }
  if (type === 'Special Access Request' || type === 'Leader Information Update' || type === 'Boundary Dispute') {
    return '/leader/settings';
  }
  if (type === 'New Report') {
    return '/leader/reports';
  }
  if (type === 'Lost & Found Report') {
    return isLeader ? '/leader/lost-and-found' : '/lost-and-found';
  }
  if (type === 'Charity Application') {
    return '/leader/charities';
  }
  if (type === 'Advert Approval Request') {
    return '/leader/adverts';
  }

  return '/notifications';
}
