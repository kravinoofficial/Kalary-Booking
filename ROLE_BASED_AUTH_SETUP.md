# Role-Based Authentication Setup

This document explains the role-based authentication system implemented for the Kalari booking system.

## Overview

The system now supports two user roles:
- **Admin**: Full access to all features including dashboard, analytics, reports, staff management
- **Staff**: Limited access to shows, booking, customers, and ticket history

## Database Setup

1. Run the `add-users-roles-table.sql` script in your Supabase SQL editor to create the users table and authentication functions.

2. The script creates:
   - `users` table with role-based access
   - `create_user()` function for adding new users
   - `authenticate_user()` function for login authentication
   - Default admin user: `admin@kalari.com` (password: `admin123`)

## User Roles & Access

### Admin Role
- Dashboard (analytics overview)
- Shows (view/create/edit)
- Layouts (manage seating layouts)
- Book Seats
- Customers (view/manage)
- Customer Reports
- Ticket History
- Reports & Analytics
- Staff Management (add/manage staff users)

### Staff Role
- Shows (view only)
- Book Seats
- Customers (view/manage)
- Ticket History

## Default Login Credentials

**Admin Account:**
- Email: `admin@kalari.com`
- Password: `admin123`

**Note:** Change the default admin password immediately after setup.

## Adding New Staff Members

1. Login as admin
2. Navigate to "Staff Management" in the sidebar
3. Click "Add Staff" button
4. Fill in the user details:
   - Full Name
   - Email
   - Password
   - Role (Admin or Staff)
5. Click "Create User"

## Security Features

- Role-based route protection
- Automatic redirection for unauthorized access
- Session management with localStorage
- Password hashing (basic implementation - upgrade for production)

## Technical Implementation

### Key Files Modified/Created:
- `src/contexts/AuthContext.tsx` - Updated for role-based auth
- `src/components/RoleProtectedRoute.tsx` - Route protection component
- `src/pages/StaffManagement.tsx` - Admin interface for managing users
- `src/components/Layout.tsx` - Role-based navigation
- `src/App.tsx` - Protected routing setup
- `add-users-roles-table.sql` - Database schema and functions

### Authentication Flow:
1. User enters credentials on login page
2. System calls `authenticate_user()` database function
3. On success, user data (including role) is stored in localStorage
4. Navigation and routes are filtered based on user role
5. Unauthorized access attempts redirect to appropriate fallback pages

## Production Considerations

1. **Password Security**: Implement proper bcrypt hashing
2. **JWT Tokens**: Replace localStorage with secure JWT tokens
3. **Session Management**: Add proper session expiration
4. **API Security**: Implement server-side role validation
5. **Audit Logging**: Track user actions and access attempts

## Troubleshooting

### Common Issues:
1. **Login fails**: Check if users table exists and default admin is created
2. **Role not working**: Verify user role in database matches expected values
3. **Navigation issues**: Check if user object contains role property
4. **Access denied**: Ensure routes are properly protected with RoleProtectedRoute

### Database Verification:
```sql
-- Check if users table exists
SELECT * FROM users;

-- Verify admin user
SELECT email, role, active FROM users WHERE email = 'admin@kalari.com';

-- Test authentication function
SELECT authenticate_user('admin@kalari.com', 'admin123');
```