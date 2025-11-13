# Sunrise Bites Cafe - Deployment Guide

## Prerequisites
- [Neon PostgreSQL](https://neon.tech) account
- [Netlify](https://netlify.com) account
- [GitHub](https://github.com) account (optional)

## Step 1: Database Setup

### 1.1 Create Neon Database
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project called "sunrise-bites-cafe"
3. Note your connection string from the dashboard
4. Copy the database credentials

### 1.2 Run Database Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd sunrise-bites-cafe

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Neon database credentials

# Run production setup
npm run setup-db