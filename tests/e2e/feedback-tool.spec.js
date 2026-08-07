import { expect, test } from '@playwright/test';

test('captures, annotates, submits, and downloads a report', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good morning, Nils' })).toBeVisible();

  await page.getByRole('button', { name: 'Give feedback' }).click();
  await expect(page.getByRole('dialog', { name: 'Capturing the visible page' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Annotate screenshot' })).toBeVisible({ timeout: 15_000 });

  const canvas = page.locator('[data-feedback-tool-root] .upper-canvas');
  const backgroundCoverage = await page.locator('[data-feedback-tool-root] .lower-canvas').evaluate((element) => {
    const context = element.getContext('2d');
    return [
      context.getImageData(1, 1, 1, 1).data[3],
      context.getImageData(element.width - 2, 1, 1, 1).data[3],
      context.getImageData(1, element.height - 2, 1, 1).data[3],
      context.getImageData(element.width - 2, element.height - 2, 1, 1).data[3],
    ];
  });
  expect(backgroundCoverage).toEqual([255, 255, 255, 255]);

  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  const x = box.x + box.width * 0.33;
  const y = box.y + box.height * 0.38;

  await page.getByRole('button', { name: 'Highlight' }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y + 55);
  await page.mouse.up();

  await page.getByRole('button', { name: 'Pen', exact: true }).click();
  await page.mouse.move(x + 20, y + 95);
  await page.mouse.down();
  await page.mouse.move(x + 90, y + 120, { steps: 5 });
  await page.mouse.up();

  await page.getByRole('button', { name: 'Arrow' }).click();
  await page.mouse.move(x + 160, y + 20);
  await page.mouse.down();
  await page.mouse.move(x + 245, y + 90);
  await page.mouse.up();

  await page.getByRole('button', { name: 'Hide' }).click();
  await page.mouse.move(x + 180, y + 120);
  await page.mouse.down();
  await page.mouse.move(x + 265, y + 155);
  await page.mouse.up();

  await page.getByRole('button', { name: 'Comment' }).click();
  await page.mouse.click(x + 60, y + 170);
  const comment = page.getByRole('dialog', { name: 'Add comment' });
  await comment.getByRole('textbox').fill('The spacing here feels inconsistent.');
  await comment.getByRole('button', { name: 'Add pin' }).click();

  await expect(page.locator('[data-feedback-tool-root] [data-status]')).toContainText('5 annotations');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('[data-feedback-tool-root] [data-status]')).toContainText('4 annotations');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.locator('[data-feedback-tool-root] [data-status]')).toContainText('5 annotations');

  await page.getByRole('button', { name: 'Select an annotation to move, resize, or delete it' }).click();
  await page.mouse.click(x + 60, y + 27);
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-feedback-tool-root] [data-status]')).toContainText('4 annotations');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('[data-feedback-tool-root] [data-status]')).toContainText('5 annotations');

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Tell us a little more' })).toBeVisible();
  await page.getByLabel('What happened?').fill('The dashboard needs a few visual adjustments.');
  await page.getByLabel('Email').fill('nils@example.com');
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Feedback captured' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.locator('[data-report-title]')).toContainText('is ready');
  await expect(page.locator('[data-report-summary]')).toContainText('5 annotations');
  await expect(page.locator('[data-report-preview]')).toBeVisible();

  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  expect((await pngDownload).suggestedFilename()).toMatch(/\.png$/);

  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  expect((await jsonDownload).suggestedFilename()).toMatch(/\.json$/);
});

test('validates the feedback form and can return to annotation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Give feedback' }).click();
  await expect(page.getByRole('dialog', { name: 'Annotate screenshot' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(page.getByText('Please describe what happened or what should change.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to annotation' }).click();
  await expect(page.getByRole('button', { name: 'Highlight' })).toBeVisible();
});

test('keeps the annotation workflow usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Give feedback' }).click();
  await expect(page.getByRole('dialog', { name: 'Annotate screenshot' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('navigation', { name: 'Annotation tools' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Tell us a little more' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to annotation' })).toBeVisible();
});
