import { expect, test } from '@playwright/test';

test('a visitor can enter the blank-board editor from the home page', async ({ page }) => {
  const hmrConsoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('/_next/hmr')) {
      hmrConsoleErrors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', {
    name: '把喜欢的图片，变成一份真正可以完成的拼豆作品',
  })).toBeVisible();

  await page.getByRole('button', { name: '从空白标准拼板开始' }).click();

  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.locator('input[type="text"]')).toHaveValue('经典挂件');
  await expect(page.locator('canvas')).toBeVisible();

  await page.getByRole('button', { name: '导入图片' }).click();
  await expect(page.getByText('点击上传 或 拖拽图片至此处')).toBeVisible();
  expect(hmrConsoleErrors).toEqual([]);
});
