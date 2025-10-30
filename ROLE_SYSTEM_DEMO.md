# Role-Based Authentication Demo

## How to Test the Role System

### 1. Database Setup
First, run the SQL script in your Supabase SQL editor:
```sql
-- Copy and paste the contents of add-users-roles-table.sql
```

### 2. Default Login Credentials

**Admin Login:**
- Email: `admin@kalari.com`
- Password: `admin123`

### 3. Testing Admin Features

1. Login with admin credentials
2. You should see all navigation items:
   - Dashboard
   - Shows
   - Layouts
   - Book Seats
   - Customers
   - Customer Reports
   - Ticket History
   - Reports
   - Analytics
   - Staff Management

### 4. Create a Staff User

1. As admin, go to "Staff Management"
2. Click "Add Staff"
3. Create a test staff user:
   - Full Name: `Test Staff`
   - Email: `staff@kalari.com`
   - Password: `staff123`
   - Role: `Staff`

### 5. Testing Staff Features

1. Logout from admin account
2. Login with staff credentials (`staff@kalari.com` / `staff123`)
3. You should only see limited navigation:
   - Shows
   - Book Seats
   - Customers
   - Ticket History

### 6. Access Control Testing

Try accessing admin-only URLs as a staff user:
- `/` (Dashboard) → Should redirect to `/shows`
- `/layouts` → Should redirect to `/shows`
- `/reports` → Should redirect to `/shows`
- `/analytics` → Should redirect to `/shows`
- `/staff` → Should redirect to `/shows`

## Visual Indicators

- **Navigation**: Different menu items based on role
- **User Display**: Shows "Admin" or "Staff" in sidebar
- **Role Badge**: Visible in Settings page
- **Access Control**: Automatic redirects for unauthorized pages

## Role Permissions Summary

| Feature | Admin | Staff |
|---------|-------|-------|
| Dashboard | ✅ | ❌ |
| Shows | ✅ | ✅ |
| Layouts | ✅ | ❌ |
| Book Seats | ✅ | ✅ |
| Customers | ✅ | ✅ |
| Customer Reports | ✅ | ❌ |
| Ticket History | ✅ | ✅ |
| Reports | ✅ | ❌ |
| Analytics | ✅ | ❌ |
| Staff Management | ✅ | ❌ |
| Settings | ✅ | ✅ |

## Security Features Implemented

1. **Route Protection**: Unauthorized routes redirect to fallback pages
2. **Navigation Filtering**: Menu items filtered by role
3. **Role Validation**: Server-side authentication with role checking
4. **Session Management**: User data stored securely in localStorage
5. **Visual Feedback**: Clear role indicators throughout the UI