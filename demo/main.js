import { createFeedbackTool, reportToJson } from '../src/index.js';

let latestReport = null;
let previewUrl = null;

const title = document.querySelector('[data-report-title]');
const summary = document.querySelector('[data-report-summary]');
const preview = document.querySelector('[data-report-preview]');
const pngButton = document.querySelector('[data-download="png"]');
const jsonButton = document.querySelector('[data-download="json"]');

function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function showReport(report) {
  latestReport = report;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(report.image);
  preview.src = previewUrl;
  preview.hidden = false;
  title.textContent = `Report ${report.id.slice(0, 8)} is ready`;
  summary.textContent = `${report.annotations.length} annotation${report.annotations.length === 1 ? '' : 's'} · ${report.metadata.viewport.width} × ${report.metadata.viewport.height} viewport`;
  pngButton.disabled = false;
  jsonButton.disabled = false;
}

pngButton.addEventListener('click', () => {
  if (latestReport) saveFile(latestReport.image, `${latestReport.id}.png`);
});

jsonButton.addEventListener('click', () => {
  if (latestReport) saveFile(new Blob([reportToJson(latestReport)], { type: 'application/json' }), `${latestReport.id}.json`);
});

createFeedbackTool({
  accentColor: '#6558d3',
  collectEmail: true,
  launcher: {
    enabled: true,
    label: 'Give feedback',
    position: 'bottom-right',
  },
  onSubmit: async (report) => {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    showReport(report);
  },
  onError: (error) => {
    console.error('Feedback tool error:', error);
  },
});
