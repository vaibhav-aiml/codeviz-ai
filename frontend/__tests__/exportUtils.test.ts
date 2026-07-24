import { describe, it, expect, vi } from 'vitest';
import { downloadPNG, downloadPDF } from '../app/exportUtils';

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,fakeData',
    width: 800,
    height: 600,
  }),
}));

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      this.addImage = vi.fn();
      this.save = vi.fn();
    }),
  };
});

describe('exportUtils', () => {
  it('downloadPNG triggers canvas render without throwing', async () => {
    const dummyElement = document.createElement('div');
    await expect(downloadPNG(dummyElement, 'test-diagram')).resolves.not.toThrow();
  });

  it('downloadPDF generates PDF without throwing', async () => {
    const dummyElement = document.createElement('div');
    await expect(downloadPDF(dummyElement, 'test-diagram')).resolves.not.toThrow();
  });
});
