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

  render(<BoardCard {...mockProps} card={completedCard} />);
  const badge = screen.getByText('ĐÃ HOÀN THÀNH');
  expect(badge).toBeDefined();
  
  // Check if the badge has softer, dimmer style classes
  expect(badge.className).toContain('text-emerald-600/60');
  expect(badge.className).toContain('text-[8px]');
});
