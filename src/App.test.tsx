import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing and shows title', () => {
    render(<App />);
    // Check if title is present (using translation key or mocked value)
    expect(screen.getByText('app.title')).toBeInTheDocument();
  });

  it('renders settings button', () => {
    render(<App />);
    // Lucid icons often don't have text, but buttons have titles
    const settingsBtn = screen.getByTitle('app.settings');
    expect(settingsBtn).toBeInTheDocument();
  });
});
