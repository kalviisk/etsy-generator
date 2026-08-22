# Etsy Listing Generator

## Deploy to Vercel (5 minutes)

### Step 1 — Upload to GitHub
1. Go to github.com and create a free account if you don't have one
2. Click **New Repository** → name it `etsy-generator` → click **Create**
3. Upload all these files to the repository

### Step 2 — Deploy on Vercel
1. Go to vercel.com and sign in with your GitHub account
2. Click **Add New Project**
3. Select your `etsy-generator` repository
4. Click **Deploy**

### Step 3 — Add your API Key
1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-your-actual-key-here`
3. Click **Save** then **Redeploy**

### Done!
Your tool will be live at `https://etsy-generator-xxx.vercel.app`
Share this link with your workers — no setup needed on their end!
