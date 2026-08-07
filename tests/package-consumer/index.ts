import {
  createFeedbackTool,
  DEFAULT_FEEDBACK_COLORS,
  DEFAULT_FEEDBACK_MESSAGES,
  reportToJson,
  type FeedbackAnnotation,
  type FeedbackReport,
} from '@franzen/feedback-tool';
import {
  createGithubIssueProvider,
  createSupportIssueClient,
  type SupportIssue,
} from '@franzen/feedback-tool/server';

const controller = createFeedbackTool({
  colors: {
    accent: DEFAULT_FEEDBACK_COLORS.accent,
    panel: '#ffffff',
  },
  launcher: {
    enabled: true,
    label: 'Give feedback',
    position: 'bottom-right',
  },
  locale: 'sv',
  messages: {
    launcherLabel: DEFAULT_FEEDBACK_MESSAGES.launcherLabel,
    next: 'Nästa',
  },
  onSubmit: async (report) => {
    const json: string = reportToJson(report);
    const annotations: FeedbackAnnotation[] = report.annotations;
    void json;
    void annotations;
  },
  onError: (error) => console.error(error),
});

const openResult: Promise<void> = controller.open();
const closeResult: boolean = controller.close();
controller.destroy();

declare const report: FeedbackReport;
const image: Blob = report.image;
const schemaVersion: 1 = report.schemaVersion;

void openResult;
void closeResult;
void image;
void schemaVersion;

const github = createGithubIssueProvider({
  repository: 'franzen/feedback-tool',
  auth: {
    type: 'app',
    appId: '123',
    installationId: '456',
    privateKey: 'server-secret',
  },
});
const supportIssues = createSupportIssueClient({ provider: github });
const forwarded: Promise<SupportIssue> = supportIssues.forwardFeedback(report, {
  title: 'Feedback from the settings page',
  screenshotUrl: 'https://app.example.com/screenshots/report.png',
  labels: ['in-app-feedback'],
});
const listed: Promise<SupportIssue[]> = supportIssues.listIssues({ status: 'all' });
void forwarded;
void listed;
