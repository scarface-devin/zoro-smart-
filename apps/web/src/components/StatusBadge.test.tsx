import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

// Note: @testing-library/react will be available through @testing-library/react
// We test using basic DOM assertions via jsdom environment

describe('StatusBadge', () => {
  it('renders "Active" label for Active status', () => {
    const { container } = render(<StatusBadge status="Active" />);
    expect(container.textContent).toContain('Active');
  });

  it('renders "Pending" label for Pending status', () => {
    const { container } = render(<StatusBadge status="Pending" />);
    expect(container.textContent).toContain('Pending');
  });

  it('renders "Maintenance" label for Maintenance status', () => {
    const { container } = render(<StatusBadge status="Maintenance" />);
    expect(container.textContent).toContain('Maintenance');
  });

  it('renders "Decommissioned" label for Decommissioned status', () => {
    const { container } = render(<StatusBadge status="Decommissioned" />);
    expect(container.textContent).toContain('Decommissioned');
  });

  it('falls back to Pending for an unknown status string', () => {
    const { container } = render(<StatusBadge status="Unknown" />);
    expect(container.textContent).toContain('Pending');
  });

  it('renders a span element', () => {
    const { container } = render(<StatusBadge status="Active" />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
  });
});
