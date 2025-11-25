# Bot Creation Logout Fix

## Issue
After creating a bot, the user was logged out even though the bot was successfully created and is in `inactive` state.

## Root Cause
The bot creation flow was using `window.location.href = '/bots'` which causes a full page reload. This can disrupt the authentication session, especially if:
1. The session token is stored in memory and not persisted properly
2. The redirect happens before the session is fully established
3. There's a timing issue with session restoration after page reload

## Fix Applied

### 1. Changed Navigation Method
**Before:**
```typescript
setTimeout(() => {
  window.location.href = '/bots';
}, 1500);
```

**After:**
```typescript
import { useNavigate } from 'react-router-dom';

// In component
const navigate = useNavigate();

// After bot creation
setTimeout(() => {
  navigate('/app/bots', { replace: true });
}, 1500);
```

**Benefits:**
- Uses React Router's client-side navigation (no full page reload)
- Preserves authentication session
- Maintains React state
- Faster navigation (no page reload overhead)

### 2. Added Better Error Handling
Added specific handling for 401 authentication errors during bot creation:

```typescript
if (!response.ok) {
  // Handle authentication errors
  if (response.status === 401) {
    logger.error('Authentication failed during bot creation');
    toast.error('Your session has expired. Please sign in again.');
    // Don't navigate away - let user see the error
    return;
  }
  
  const error = await response.json().catch(() => ({ detail: 'Failed to create bot' }));
  throw new Error(error.detail || 'Failed to create bot');
}
```

This prevents:
- Unexpected navigation on auth errors
- Silent failures
- User confusion about what happened

## Files Modified

1. **`apps/frontend/src/pages/DCABot.tsx`**
   - Added `useNavigate` import from `react-router-dom`
   - Added `navigate` hook initialization
   - Changed `window.location.href` to `navigate('/app/bots', { replace: true })`
   - Added 401 error handling in bot creation

## Testing

After this fix, verify:
1. ✅ Create a bot → User should remain logged in
2. ✅ Bot should be created successfully
3. ✅ Navigation to Bots page should work smoothly
4. ✅ Session should persist after navigation
5. ✅ If auth error occurs, user should see error message (not silent logout)

## Additional Notes

- The route path changed from `/bots` to `/app/bots` to match the actual route structure in `App.tsx`
- Using `replace: true` prevents adding a new history entry (user can't go back to the bot creation page after successful creation)
- The 1.5 second delay is kept to allow the success toast to be visible

