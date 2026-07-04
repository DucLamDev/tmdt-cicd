import React from 'react';
import { render, screen } from '@testing-library/react';
import OrderStatusBadge from '../OrderStatusBadge';

describe('OrderStatusBadge Component', () => {
  test('should render pending status', () => {
    render(<OrderStatusBadge status="pending" />);

    const badge = screen.getByText(/chờ xác nhận/i);
    expect(badge).toBeInTheDocument();
  });

  test('should render confirmed status', () => {
    render(<OrderStatusBadge status="confirmed" />);

    const badge = screen.getByText(/đã xác nhận/i);
    expect(badge).toBeInTheDocument();
  });

  test('should render shipping status', () => {
    render(<OrderStatusBadge status="shipping" />);

    const badge = screen.getByText(/đang giao/i);
    expect(badge).toBeInTheDocument();
  });

  test('should render delivered status', () => {
    render(<OrderStatusBadge status="delivered" />);

    const badge = screen.getByText(/đã giao/i);
    expect(badge).toBeInTheDocument();
  });

  test('should render cancelled status', () => {
    render(<OrderStatusBadge status="cancelled" />);

    const badge = screen.getByText(/đã hủy/i);
    expect(badge).toBeInTheDocument();
  });

  test('should have correct color for pending status', () => {
    const { container } = render(<OrderStatusBadge status="pending" />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  test('should have correct color for confirmed status', () => {
    const { container } = render(<OrderStatusBadge status="confirmed" />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  test('should have correct color for delivered status', () => {
    const { container } = render(<OrderStatusBadge status="delivered" />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  test('should have correct color for cancelled status', () => {
    const { container } = render(<OrderStatusBadge status="cancelled" />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });
});
