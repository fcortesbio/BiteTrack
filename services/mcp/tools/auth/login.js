/**
 * @file login.js
 * @description Authenticate with BiteTrack API and store JWT token
 *
 * @example
 * import * as auth from './tools/auth';
 * const result = await auth.login({
 *   email: 'user@example.com',
 *   password: 'securepassword'
 * });
 * console.log(`Logged in as ${result.role}`);
 */

/**
 * Login to BiteTrack and store JWT token for subsequent requests
 * @param {Object} params - Login parameters
 * @param {string} params.email - User email address
 * @param {string} params.password - User password
 * @returns {Promise<Object>} Login result with token and user info
 */
export async function login({ email, password }) {
  // Validate parameters
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Make API call (apiClient is injected by sandbox)
  const response = await apiClient.post("/bitetrack/auth/login", {
    email,
    password,
  });

  // Store token in session (sessionManager is injected by sandbox)
  await sessionManager.setToken(response.data.token);

  return {
    success: true,
    token: response.data.token,
    role: response.data.seller.role,
    user: {
      id: response.data.seller.id,
      firstName: response.data.seller.firstName,
      lastName: response.data.seller.lastName,
      email: response.data.seller.email,
    },
  };
}
