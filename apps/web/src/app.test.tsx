import { render, screen } from '@testing-library/react';
import { App } from './app';

it('renders the product name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'MiniVault' })).toBeInTheDocument();
});
