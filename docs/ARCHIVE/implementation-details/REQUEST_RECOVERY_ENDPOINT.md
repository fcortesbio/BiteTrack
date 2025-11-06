# User-Initiated Password Recovery

## Overview
Added a new public endpoint `/auth/request-recovery` that allows users to request a password reset by providing their email and date of birth. This addresses the security requirement for users to self-initiate password recovery without needing SuperAdmin assistance.

## Endpoint Details

### POST `/bitetrack/auth/request-recovery`

**Authentication:** None (public endpoint)

**Purpose:** Allow users to request a password reset without requiring a SuperAdmin to initiate it.

#### Request

```json
{
  "email": "user@example.com",
  "dateOfBirth": "1990-05-15"
}
```

**Validation:**
- `email`: Required, must be valid email format
- `dateOfBirth`: Required, must be ISO 8601 date format

#### Response (Success)

**Status Code:** 200

```json
{
  "message": "If an account exists with this email and date of birth, a password reset link has been sent"
}
```

**Development Mode Only:**
```json
{
  "message": "If an account exists with this email and date of birth, a password reset link has been sent",
  "token": "generated_reset_token_here",
  "emailPreview": "https://ethereal.email/message/..."
}
```

#### Response (Error)

**Status Code:** 500

```json
{
  "error": "Internal Server Error",
  "message": "An error occurred during password recovery request",
  "statusCode": 500
}
```

## Security Features

### User Privacy
- **Same Response for Valid/Invalid Emails**: The endpoint always returns the same generic message whether or not an account is found with the provided email and date of birth
- **Prevents Email Enumeration**: Attackers cannot use this endpoint to determine which emails are registered
- **Identity Verification**: Users must provide both email AND date of birth to match their account

### Token Security
- **Secure Generation**: Cryptographically secure token generated for each request
- **24-Hour Expiration**: Tokens expire after 24 hours
- **One-Time Use**: Tokens are deleted after successful password reset
- **Database Storage**: Tokens linked to seller ID in PasswordResetToken collection

### Email Delivery
- Development: Shows Ethereal preview URL for testing
- Production: Silently handles email delivery failures (still returns success message)
- Email contains secure reset link with embedded token

## User Flow

### Step 1: Request Recovery
User provides email and date of birth:
```bash
curl -X POST http://localhost:3000/bitetrack/auth/request-recovery \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "dateOfBirth": "1990-05-15"
  }'
```

### Step 2: Check Email
- User receives password reset email
- Email contains reset link with token embedded
- Link format: `{CLIENT_URL}/reset-password?token={GENERATED_TOKEN}`

### Step 3: Complete Reset
User clicks reset link and completes password reset via `/auth/reset` endpoint:
```bash
curl -X POST http://localhost:3000/bitetrack/auth/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token_from_email",
    "email": "user@example.com",
    "dateOfBirth": "1990-05-15",
    "newPassword": "NewSecurePass123!"
  }'
```

## Development Testing

### Using Ethereal Email Preview
In development mode, the response includes a preview URL:

```json
{
  "token": "abc123xyz",
  "emailPreview": "https://ethereal.email/message/WjYjEu_... "
}
```

Click the `emailPreview` URL to see the rendered email. Copy the token from the email or use the token directly from the response.

### Testing Workflow
```bash
# 1. Request recovery with test user details
TOKEN_RESP=$(curl -X POST http://localhost:3000/bitetrack/auth/request-recovery \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@bitetrack.io",
    "dateOfBirth": "1997-04-03"
  }')

RESET_TOKEN=$(echo $TOKEN_RESP | jq -r '.token')
EMAIL_PREVIEW=$(echo $TOKEN_RESP | jq -r '.emailPreview')

# 2. Check email preview (development only)
echo "Check email at: $EMAIL_PREVIEW"

# 3. Reset password with token
curl -X POST http://localhost:3000/bitetrack/auth/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'$RESET_TOKEN'",
    "email": "superadmin@bitetrack.io",
    "dateOfBirth": "1997-04-03",
    "newPassword": "NewPassword123!"
  }'
```

## Differences from SuperAdmin Recovery Endpoint

| Feature | `/auth/recover` (SuperAdmin) | `/auth/request-recovery` (User) |
|---------|------------------------------|--------------------------------|
| Authentication | Required (SuperAdmin) | None (Public) |
| Input | sellerId | email + dateOfBirth |
| Intent | Admin-initiated | User self-service |
| User Privacy | None (admin action) | High (same response for all cases) |
| Use Case | Account lockouts | Forgotten passwords |

## Implementation Details

### Files Modified
- `controllers/authController.js` - Added `requestRecovery()` function
- `routes/auth.js` - Added `/request-recovery` route
- `utils/validation.js` - Added `requestRecovery` validation rules

### Key Design Decisions

1. **Generic Response Message**
   - Always returns same message to prevent email enumeration attacks
   - Errors silently fail (don't expose email service issues to users)

2. **Identity Verification**
   - Requires both email AND date of birth to match account
   - Matches pattern used in account activation flow
   - Prevents password reset with just an email address

3. **Development/Production Separation**
   - Dev: Returns token + preview URL for testing
   - Prod: Only returns confirmation message (real users get email)

4. **Integration with Existing Flow**
   - Uses same `PasswordResetToken` model
   - Uses same `reset()` endpoint to complete recovery
   - Uses same email service as SuperAdmin recovery

## Configuration

No additional configuration needed beyond existing password reset setup. The endpoint uses:
- Existing SMTP configuration (from `.secrets` or environment variables)
- Existing `CLIENT_URL` for reset links
- Existing `PasswordResetToken` model and expiration (24 hours)

## Error Handling

The endpoint handles these scenarios:
- **Valid account**: Generates token, sends email, returns generic success
- **Invalid email**: Returns generic success message (security)
- **Invalid date of birth**: Returns generic success message (security)
- **Email service failure**: Returns generic success, logs error (user cannot be exposed to service failures)
- **Database error**: Returns 500 error

## Next Steps (Optional Enhancements)

1. Add rate limiting to prevent abuse
2. Add email verification confirmation
3. Implement account lockout after failed password reset attempts
4. Add SMS notifications as secondary verification
5. Create admin dashboard to monitor password recovery requests
6. Implement progressive delay (e.g., 5 seconds) after multiple failed attempts
