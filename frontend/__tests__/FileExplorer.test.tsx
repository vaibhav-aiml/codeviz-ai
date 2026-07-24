import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileExplorer from '../app/FileExplorer';

describe('FileExplorer', () => {
  const mockFileTree = {
    '/': {
      dirs: ['src'],
      files: ['README.md', 'package.json'],
    },
    'src': {
      dirs: [],
      files: ['index.ts'],
    },
  };

  it('renders root files correctly', () => {
    render(<FileExplorer fileTree={mockFileTree} analysisId="test-123" apiUrl="http://localhost:8000" />);
    expect(screen.getByText('README.md')).toBeTruthy();
    expect(screen.getByText('package.json')).toBeTruthy();
  });
});
