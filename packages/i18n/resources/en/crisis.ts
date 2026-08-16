/**
 * @smart-edms/i18n — English baseline: `crisis` namespace (spec §16.4, §9.11)
 *
 * Crisis Response Room: real-time incident coordination.
 */

const crisis = {
  'title': 'Crisis Response Room',
  'subtitle': 'Real-time incident coordination',
  'eventFeed': 'Event Feed',
  'events': 'events',
  'noEvents': 'No events',
  'noEventsDescription': 'No crisis events recorded yet',
  'participants': 'Participants',
  'active': 'active',
  'noParticipants': 'No participants in the crisis room',
  'typeMessage': 'Type a message...',
  'send': 'Send',
  'notifyAll': 'Notify All',
  'lockdown': 'Lockdown',
  'lockedDown': 'Locked Down',
  'lockdownDeployment': 'Lockdown Deployment',
  'escalate': 'Escalate to Security Team',
  'notifyStakeholders': 'Notify Stakeholders',
  'quickActions': 'Quick Actions',
} as const;

export default crisis;
