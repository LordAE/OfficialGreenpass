import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68a387e52af522b3dc40943c", 
  requiresAuth: false, // Ensure authentication is required for all operations
});
