# Kalary Booking System - Setup Guide

## Step 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and enter project details:
   - Name: `kalary-booking`
   - Database Password: (choose a strong password)
   - Region: (choose closest to your location)

### 1.2 Get Project Credentials
1. Go to Project Settings → API
2. Copy the following:
   - Project URL
   - `anon` `public` key

### 1.3 Create Environment File
Create `.env` in the project root:
```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 2: Database Setup

### 2.1 Run Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire content from `supabase-schema.sql`
3. Click "Run" to execute the schema

This creates:
- All required tables (layouts, shows, bookings, tickets)
- Indexes for performance
- The `book_seats_atomic()` function for safe booking

### 2.2 Verify Tables
Go to Database → Tables and verify these tables exist:
- `layouts`
- `shows` 
- `bookings`
- `tickets`

## Step 3: Authentication Setup

### 3.1 Create Admin User
1. Go to Authentication → Users
2. Click "Add User"
3. Enter admin email and password
4. Click "Create User"

### 3.2 Configure Auth Settings (Optional)
1. Go to Authentication → Settings
2. Disable "Enable email confirmations" for easier setup
3. Set Site URL to your domain (for production)

## Step 4: Test the Application

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Start Development Server
```bash
npm start
```

### 4.3 Login and Test
1. Open http://localhost:3000
2. Login with your admin credentials
3. Test each feature:
   - Create a layout
   - Add a show
   - Book some seats
   - View tickets

## Step 5: Sample Data (Optional)

### 5.1 Add Sample Layout
The schema already includes a sample layout. You can add more:

```sql
INSERT INTO layouts (name, structure) VALUES 
('Small Hall', '{
    "sections": [
        {"name": "North", "rows": 3, "seatsPerRow": 6, "price": 80},
        {"name": "South", "rows": 3, "seatsPerRow": 6, "price": 80},
        {"name": "East", "rows": 2, "seatsPerRow": 4, "price": 100},
        {"name": "West", "rows": 2, "seatsPerRow": 4, "price": 100}
    ]
}');
```

### 5.2 Add Sample Show
```sql
INSERT INTO shows (title, date, time, price, layout_id, active) 
SELECT 
    'Kalaripayattu Performance', 
    CURRENT_DATE + INTERVAL '7 days',
    '19:00:00',
    100.00,
    id,
    true
FROM layouts 
WHERE name = 'Main Hall 360°';
```

## Step 6: Production Deployment

### 6.1 Build the App
```bash
npm run build
```

### 6.2 Deploy Options

**Vercel:**
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically

**Netlify:**
1. Drag `build` folder to Netlify
2. Or connect GitHub repo
3. Add environment variables in site settings

**Self-hosted:**
1. Upload `build` folder to web server
2. Configure web server to serve React app
3. Set environment variables on server

### 6.3 Update Supabase Settings
1. Go to Authentication → Settings
2. Add your production domain to "Site URL"
3. Add domain to "Redirect URLs" if needed

## Troubleshooting

### Common Issues

**1. "Invalid API key" error**
- Check your `.env` file has correct Supabase credentials
- Restart development server after adding `.env`

**2. "relation does not exist" error**
- Make sure you ran the complete `supabase-schema.sql`
- Check Supabase logs for any SQL errors

**3. Login not working**
- Verify admin user exists in Supabase Auth
- Check browser console for auth errors
- Ensure correct email/password

**4. Booking fails**
- Check if `book_seats_atomic` function exists
- Verify show has a valid layout_id
- Check browser console for errors

### Getting Help

1. Check Supabase logs in Dashboard → Logs
2. Check browser console for JavaScript errors
3. Verify all environment variables are set
4. Test database connection in Supabase SQL Editor

## Security Notes

- Keep your Supabase credentials secure
- The `anon` key is safe for client-side use
- Consider enabling Row Level Security for production
- Regular backup of your Supabase database

## Next Steps

After setup, you can:
1. Customize the UI colors and branding
2. Add more layout types
3. Integrate payment processing
4. Add email notifications
5. Create mobile-responsive improvements

Your Kalary Booking System is now ready to use! 🎭