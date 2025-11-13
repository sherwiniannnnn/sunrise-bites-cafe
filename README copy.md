# ☀️ Sunrise Bites Cafe - Online Food Ordering System

A complete, full-stack online food ordering system built with HTML, CSS, JavaScript, and PostgreSQL, deployed on Netlify with serverless functions.

## 🚀 Live Demo

**Main Site:** https://sunrisebff.netlify.app/staff/dashboard.html 
**System Test:** https://sunrisebff.netlify.app/test/final-test

## 📋 Features

### 👥 Multi-User System
- **Customers:** Browse menu, place orders, track status
- **Staff:** Manage orders, update status, kitchen display
- **Admins:** Full system management, analytics, reporting

### 🛍️ Core Functionality
- 🍽️ Interactive menu with categories
- 🛒 Shopping cart with quantity management
- 📱 Fully responsive design
- 🔐 Secure authentication
- 📊 Real-time analytics
- 🧾 Order tracking and history

### 🏗️ Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Netlify Serverless Functions
- **Database:** Neon PostgreSQL
- **Deployment:** Netlify
- **Charts:** Chart.js for analytics

## 🎯 Quick Start

### Demo Accounts

**Customer:**
- Email: `demo@example.com`
- Password: `demo123`

**Staff:**
- Chef: `SB001` / `chef123`
- Server: `SB002` / `server123` 
- Manager: `SB003` / `manager123`

**Admin:**
- Username: `admin`
- Password: `admin123`

## 🚀 Deployment

### Prerequisites
- [Neon PostgreSQL](https://neon.tech) account
- [Netlify](https://netlify.com) account

### 1. Database Setup
```bash
# Clone repository
git clone <your-repo>
cd sunrise-bites-cafe

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Neon database credentials

# Initialize database
npm run setup-db
