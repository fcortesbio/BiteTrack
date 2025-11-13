/**
 * Session Manager
 * Manages JWT tokens and session state for MCP clients
 */

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

    // Cleanup expired sessions every 15 minutes
    setInterval(() => this.cleanup(), 15 * 60 * 1000);
  }

  /**
   * Create a new session
   * @param {string} sessionId - Unique session identifier
   * @returns {Object} Session object
   */
  createSession(sessionId) {
    const session = {
      id: sessionId,
      token: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      executionCount: 0,
    };

    this.sessions.set(sessionId, session);
    console.log(`Session created: ${sessionId}`);
    return session;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session object or null
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      return session;
    }
    return null;
  }

  /**
   * Set JWT token for a session
   * @param {string} sessionId - Session identifier
   * @param {string} token - JWT token
   */
  setToken(sessionId, token) {
    const session = this.getSession(sessionId);
    if (session) {
      session.token = token;
      console.log(`Token set for session: ${sessionId}`);
    } else {
      throw new Error(`Session not found: ${sessionId}`);
    }
  }

  /**
   * Get JWT token for a session
   * @param {string} sessionId - Session identifier
   * @returns {string|null} JWT token or null
   */
  getToken(sessionId) {
    const session = this.getSession(sessionId);
    return session ? session.token : null;
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session identifier
   */
  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    console.log(`Session deleted: ${sessionId}`);
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactive = now - session.lastActivity;
      if (inactive > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Get session statistics
   * @returns {Object} Session stats
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.entries()).map(
        ([id, session]) => ({
          id,
          hasToken: !!session.token,
          ageMinutes: Math.floor((Date.now() - session.createdAt) / 60000),
          executionCount: session.executionCount,
        }),
      ),
    };
  }
}

export default new SessionManager();
