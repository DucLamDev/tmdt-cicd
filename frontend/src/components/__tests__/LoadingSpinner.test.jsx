import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('should render loading spinner', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  test('should display loading text', () => {
    render(<LoadingSpinner />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('should have correct CSS classes', () => {
    const { container } = render(<LoadingSpinner />);

    const spinnerContainer = container.firstChild;
    expect(spinnerContainer).toHaveClass('flex', 'justify-center', 'items-center');
  });

  test('should render with custom size', () => {
    render(<LoadingSpinner size="large" />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });
});
