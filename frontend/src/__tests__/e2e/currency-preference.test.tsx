import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from '@/pages/ProfilePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Mock useAuth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      preferredCurrency: 'USD',
    },
    isAuthenticated: true,
    isLoading: false,
    refreshUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Currency Preference E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should complete currency preference change flow', async () => {
    const user = userEvent.setup();

    // Step 1: Open Profile page
    render(<ProfilePage />);

    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByLabelText('Preferred Currency')).toBeInTheDocument();
    });

    // Step 2: Change currency to EUR
    const currencySelect = screen.getByLabelText('Preferred Currency');
    await user.click(currencySelect);

    // Wait for dropdown to open
    await waitFor(() => {
      const eurOptions = screen.getAllByText('EUR €');
      expect(eurOptions.length).toBeGreaterThan(0);
    });

    // Click on EUR option (the one in SelectContent/SPAN, not SelectValue)
    const eurOptions = screen.getAllByText('EUR €');
    await user.click(eurOptions[1]);

    // Step 3: Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Verify success toast appears
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });
  });

  it('should reflect currency change in dashboard', async () => {
    // Override mock to return EUR as preferred currency
    server.use(
      http.get('/api/user/profile', () => {
        return HttpResponse.json({
          data: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            telegramChatId: undefined,
            subscriptionLimit: 15,
            role: 'user',
            emailVerified: true,
            preferredCurrency: 'EUR',
          },
        });
      })
    );

    // Step 1: Open Dashboard page with EUR as preferred currency
    render(<DashboardPage />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
    });

    // Verify dashboard shows EUR currency when preferredCurrency is EUR
    await waitFor(() => {
      expect(screen.getByText('€22.08')).toBeInTheDocument();
    });

    // Verify subtitle shows correct currency code (there are two - for monthly and yearly)
    await waitFor(() => {
      const eurEquivalents = screen.getAllByText('EUR equivalent');
      expect(eurEquivalents.length).toBe(2);
    });
  });
});
