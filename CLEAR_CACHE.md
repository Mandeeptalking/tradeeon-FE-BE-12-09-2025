# Clear Cache Instructions

If you see errors about deleted files (like SimpleChartStudio.tsx), you need to clear Vite's cache.

## Quick Fix

**Stop the dev server** (Ctrl+C), then run:

### Option 1: PowerShell (Windows)
```powershell
cd apps\frontend
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
```

### Option 2: Manual
1. Stop the dev server
2. Delete `apps/frontend/node_modules/.vite` folder
3. Restart dev server: `npm run dev`

### Option 3: Clean Rebuild
```powershell
cd apps\frontend
Remove-Item -Path "node_modules\.vite" -Recurse -Force
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
```

## Why This Happens

Vite caches imports and CSS processing. When files are deleted, the cache still references them until cleared.

