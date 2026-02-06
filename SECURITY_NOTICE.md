# Security Notice - API Key Rotation Required

## What Happened
A Google Gemini API key was accidentally committed to the git repository in commits `7764dec` and `0cb0712` on February 6, 2026.

## Actions Taken
1. ✅ **Removed the API key from git history** using `git filter-branch`
2. ✅ **Cleaned up backup refs** and ran garbage collection
3. ✅ **Force pushed to GitHub** to clean the remote repository
4. ✅ **Cleared the API key** from `backend/.env` file

## Required Action: Generate New API Key

⚠️ **IMPORTANT**: The exposed API key should be considered compromised and must be replaced.

### Steps to Get a New API Key:

1. **Visit Google AI Studio**: https://aistudio.google.com/
2. **Sign in** with your Google account
3. **Go to API Keys section** (left sidebar)
4. **Delete the old key**: `AIzaSyDiQ9CX-RShqKEQZ1MCSeZtbcbGpU9mcnQ`
5. **Create new API key**: Click "Create API key"
6. **Copy the new key** (starts with `AIza...`)
7. **Add to `.env` file**:
   ```bash
   cd backend
   # Edit .env file
   GEMINI_API_KEY="your-new-key-here"
   ```

## Prevention Tips

✅ **Always check** `.env` files are in `.gitignore`  
✅ **Never commit** API keys, passwords, or secrets  
✅ **Use environment variables** for sensitive data  
✅ **Review commits** before pushing to public repositories  
✅ **Enable git hooks** to scan for secrets (e.g., `git-secrets`)

## Git History Cleaned
The file `backend/test-gemini.js` containing the exposed key has been completely removed from:
- All commits
- All branches
- Remote repository (GitHub)
- Local backup refs

Date: February 6, 2026
