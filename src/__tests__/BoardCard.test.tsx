import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import BoardCard from '../components/BoardCard';

const mockProps = {
  isEditingCard: false,
  editCardTitle: "",
  setEditCardTitle: vi.fn(),
  setEditingCardId: vi.fn(),
  handleRenameCardSubmit: vi.fn(),
  setCardToDelete: vi.fn(),
  handleCardMouseEnter: vi.fn(),
  handleCardMouseLeave: vi.fn(),
  onDragStartCard: vi.fn(),
  onDragEndCard: vi.fn(),
  onCardDropOnCard: vi.fn(),
  activeDragCardId: null,
  dragOverCardId: null,
  onDragOverCard: vi.fn(),
  onDragLeaveCard: vi.fn(),
  onCardClick: vi.fn(),
};

test('renders completed card with green borders and dim label styling', () => {
  const completedCard = {
    id: 'card-completed-1',
    list_id: 'list-1',
    title: 'Completed Task Title',
    content: null,
    position: 1,
    due_date: null,
    created_at: '2026-07-14T00:00:00.000Z',
    is_completed: true,
  };

  const { container } = render(<BoardCard {...mockProps} card={completedCard} />);
  const badge = screen.getByText('ĐÃ HOÀN THÀNH');
  expect(badge).toBeDefined();
  
  // Check if the badge has softer, dimmer style classes
  expect(badge.className).toContain('text-emerald-600/60');
  expect(badge.className).toContain('text-[8px]');

  // Check wrapper background classes
  const cardElement = container.querySelector('#card-completed-1');
  expect(cardElement).toBeDefined();
  expect(cardElement?.className).toContain('bg-[#f4fdf8]');
  expect(cardElement?.className).toContain('hover:bg-[#ecfaf1]');
});

test('renders in-progress card with orange borders and solid orange-tinted background', () => {
  const inProgressCard = {
    id: 'card-progress-1',
    list_id: 'list-1',
    title: 'In Progress Task Title',
    content: null,
    position: 1,
    due_date: null,
    created_at: '2026-07-14T00:00:00.000Z',
    is_in_progress: true,
  };

  const { container } = render(<BoardCard {...mockProps} card={inProgressCard} />);
  const badge = screen.getByText('ĐANG DIỄN RA');
  expect(badge).toBeDefined();

  // Check wrapper background classes
  const cardElement = container.querySelector('#card-progress-1');
  expect(cardElement).toBeDefined();
  expect(cardElement?.className).toContain('bg-[#fffcf5]');
  expect(cardElement?.className).toContain('hover:bg-[#fff5e6]');
});

