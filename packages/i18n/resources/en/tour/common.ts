/**
 * @smart-edms/i18n — English baseline: `tour.common` namespace (spec §16.4)
 *
 * Shared chrome for all guided tours: navigation buttons, progress, skip,
 * dismiss, completion.
 */

const tourCommon = {
  'progress.step': 'Step {{current}} of {{total}}',
  'progress.percent': '{{percent}}% complete',
  'button.next': 'Next',
  'button.previous': 'Previous',
  'button.skip': 'Skip tour',
  'button.finish': 'Finish tour',
  'button.restart': 'Restart tour',
  'button.pause': 'Pause',
  'button.resume': 'Resume',
  'button.gotIt': 'Got it',
  'button.dismiss': 'Dismiss',
  'button.help': 'Help',
  'button.takeTour': 'Take the tour',
  'button.notNow': 'Not now',
  'button.dontShowAgain': 'Don’t show again',

  'overlay.title': 'Guided tour',
  'overlay.dismiss': 'Click anywhere outside to dismiss',
  'tooltip.previous': 'Go back to the previous step',
  'tooltip.next': 'Continue to the next step',
  'tooltip.skip': 'Skip this tour',
  'tooltip.finish': 'Finish the tour',

  'welcome.title': 'Welcome to Smart EDMS',
  'welcome.subtitle': 'Let’s take a quick tour to get you familiar with the essentials.',
  'welcome.body': 'This tour takes about {{minutes}} minutes. You can pause or skip at any time — your progress is saved automatically.',
  'welcome.estimatedTime': 'Estimated time: {{minutes}} minutes',

  'completion.title': 'You’re all set!',
  'completion.subtitle': 'You’ve completed the {{tourName}} tour.',
  'completion.body': 'You can revisit any tour from the Help menu at any time.',
  'completion.next': 'What’s next?',
  'completion.takeAnotherTour': 'Take another tour',
  'completion.exploreOnYourOwn': 'Explore on my own',
  'completion.feedback': 'Was this tour helpful?',

  'paused.title': 'Tour paused',
  'paused.subtitle': 'Your progress has been saved. Resume whenever you’re ready.',
  'paused.body': 'You can find this tour again in the Help menu.',
  'paused.resume': 'Resume tour',
  'paused.restart': 'Restart from the beginning',
  'paused.dismiss': 'Dismiss tour',

  'skipped.title': 'Tour skipped',
  'skipped.body': 'No problem. You can take this tour later from the Help menu.',
  'skipped.dontShowAgain': 'Don’t show this tour again',

  'error.title': 'Tour unavailable',
  'error.body': 'This tour could not be loaded. Please try again later or contact support.',
  'error.notLicensed': 'This tour is not included in your current license plan.',
  'error.notFound': 'The requested tour could not be found.',

  'analytics.stepCompleted': 'Step completed',
  'analytics.tourCompleted': 'Tour completed',
  'analytics.tourSkipped': 'Tour skipped',
  'analytics.tourDismissed': 'Tour dismissed',
  'analytics.feedback': 'Feedback submitted',

  'checklist.title': 'Checklist',
  'checklist.subtitle': 'A few items to complete this tour.',
  'checklist.completed': 'Completed',
  'checklist.incomplete': 'Not done yet',
  'checklist.optional': 'Optional',
  'checklist.required': 'Required',
  'checklist.progress': '{{done}} of {{total}} done',

  'keyboard.shortcuts': 'Keyboard shortcuts',
  'keyboard.next': 'Next step: Arrow Right',
  'keyboard.previous': 'Previous step: Arrow Left',
  'keyboard.skip': 'Skip tour: Escape',
  'keyboard.finish': 'Finish tour: Enter',

  'visual.highlight': 'Highlighted area',
  'visual.beacon': 'Click here to continue',
  'visual.spotlight': 'Spotlight',
  'visual.tooltip': 'Tooltip',

  'accessibility.tourStarted': 'Guided tour started. Use arrow keys to navigate and Escape to skip.',
  'accessibility.stepChanged': 'Step {{current}} of {{total}}: {{title}}',
  'accessibility.tourCompleted': 'Tour completed. You can now use the application normally.',
} as const;

export default tourCommon;
