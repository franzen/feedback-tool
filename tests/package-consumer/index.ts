import {
  createFeedbackTool,
  reportToJson,
  type FeedbackAnnotation,
  type FeedbackReport,
} from '@franzen/feedback-tool';

const controller = createFeedbackTool({
  launcher: {
    enabled: true,
    label: 'Give feedback',
    position: 'bottom-right',
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
