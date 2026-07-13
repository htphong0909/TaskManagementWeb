/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import Home from '../app/page';
import { supabase } from '../lib/supabase';

// Mock Supabase to avoid network calls and authentication issues during testing
vi.mock('../lib/supabase', () => {
  const mockFrom = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockReturnValue(mockFrom),
    },
  };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    id: 'test-board-id',
  }),
}));

test('renders the task management homepage login form after initialization', async () => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);
  await act(async () => {
    render(<Home />);
  });
  const loginHeader = screen.getByText(/Đăng nhập HTPhongNAThy/i);
  expect(loginHeader).toBeDefined();
});

test('renders the redirecting message when user is logged in', async () => {
  // Mock active session
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: mockUser } } as any });
  
  await act(async () => {
    render(<Home />);
  });
  
  const redirectText = screen.getByText(/Đang chuyển tới không gian làm việc/i);
  expect(redirectText).toBeDefined();
});
