/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import BoardSwitcher from '../components/BoardSwitcher';
import { supabase } from '../lib/supabase';

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/board/board-1',
}));

// Mock Supabase
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

test('renders boards list with formatted date MM/YYYY and counts', async () => {
  const mockFolders = [
    { id: 'folder-1', title: 'Work Folder', position: 1 }
  ];
  const mockBoards = [
    { id: 'board-1', title: 'Main Board', folder_id: 'folder-1', board_date: '2026-07-15T00:00:00.000Z', position: 1 }
  ];
  const mockCards = [
    { is_completed: true, is_in_progress: false, lists: { board_id: 'board-1' } },
    { is_completed: false, is_in_progress: true, lists: { board_id: 'board-1' } },
    { is_completed: false, is_in_progress: true, lists: { board_id: 'board-1' } },
  ];

  // Set up explicit chain mocks to avoid "this" resolution issues
  const foldersBuilder = {} as any;
  foldersBuilder.select = vi.fn().mockReturnValue(foldersBuilder);
  foldersBuilder.order = vi.fn().mockImplementation(() => {
    return Promise.resolve({ data: mockFolders, error: null });
  });

  const boardsBuilder = {} as any;
  boardsBuilder.select = vi.fn().mockReturnValue(boardsBuilder);
  boardsBuilder.order = vi.fn().mockImplementation(() => {
    return Promise.resolve({ data: mockBoards, error: null });
  });

  const cardsBuilder = {} as any;
  cardsBuilder.select = vi.fn().mockImplementation(() => {
    return Promise.resolve({ data: mockCards, error: null });
  });

  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'folders') return foldersBuilder;
    if (table === 'boards') return boardsBuilder;
    if (table === 'cards') return cardsBuilder;
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
  });

  await act(async () => {
    render(
      <BoardSwitcher
        activeBoardId="board-1"
        userEmail="test@example.com"
        onSignOut={() => {}}
      />
    );
  });

  // Wait a short time for mount/fetch promises to resolve
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  // Verify the date is formatted to 07/2026
  const dateElement = screen.getByText('07/2026');
  expect(dateElement).toBeDefined();

  // Verify the board title is shown
  const boardTitleElement = screen.getByText('Main Board');
  expect(boardTitleElement).toBeDefined();

  // Verify counts are shown
  const completedCount = screen.getByText('1');
  const inProgressCount = screen.getByText('2');
  expect(completedCount).toBeDefined();
  expect(inProgressCount).toBeDefined();
});
