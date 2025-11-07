# Add JWT Secret to ECS - Manual Steps

## Your JWT Secret
```
b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ==
```

## Step-by-Step Instructions

### Step 1: Go to ECS Task Definitions
1. Open AWS Console: https://console.aws.amazon.com
2. Search for "ECS" in the top search bar
3. Click **ECS** → **Task Definitions** (left sidebar)
4. Find **tradeeon-backend** in the list
5. Click on **tradeeon-backend** (the name, not the checkbox)

### Step 2: Create New Revision
1. Click the **Create new revision** button (top right)
2. Scroll down to **Container Definitions**
3. Click on the container name **tradeeon-backend** (it's a link/button)

### Step 3: Add Environment Variable
1. Scroll down to **Environment Variables** section
2. Click **Add environment variable** button
3. Fill in:
   - **Key**: `SUPABASE_JWT_SECRET`
   - **Value**: `b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ==`
4. Click **Update** (at the bottom of the container definition)

### Step 4: Create Revision
1. Scroll to the bottom of the page
2. Click **Create** button
3. Wait for the new revision to be created (you'll see a success message)

### Step 5: Update ECS Service
1. Go to **ECS** → **Clusters** (left sidebar)
2. Click on **tradeeon-cluster**
3. Click on the **Services** tab
4. Click on **tradeeon-backend-service**
5. Click **Update** button (top right)
6. Under **Task definition**, click the dropdown
7. Select the **latest revision** (should be the one you just created)
8. Click **Update** button at the bottom
9. Wait 2-3 minutes for deployment to complete

### Step 6: Verify Deployment
1. In the service page, check the **Deployments** tab
2. Wait until the new deployment shows **Running** status
3. The old deployment will show **Stopped**

## Done! ✅

After deployment completes, test your connection again. The JWT verification error should be fixed.

