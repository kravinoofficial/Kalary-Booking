# Enhanced Seat Arrangement System with Individual Row Configuration

## Overview
The seat arrangement system has been completely redesigned to support **individual row configuration**, allowing you to set different numbers of seats for each row within a section. This provides maximum flexibility for creating realistic theater layouts.

## Key Features

### 1. **Four-Section Layout**
- **North Section**: Seats facing the stage from the north side
- **South Section**: Seats facing the stage from the south side  
- **East Section**: Side seating arranged in columns
- **West Section**: Side seating arranged in columns

### 2. **Individual Row Configuration** ⭐ NEW!
Each section now supports:
- **Custom Name**: Rename sections as needed
- **Individual Row Setup**: Configure each row independently
- **Variable Seat Counts**: Each row can have different numbers of seats (0-30 per row)
- **Dynamic Row Management**: Add/remove rows as needed
- **Layout-Only Configuration**: Layouts define seating structure only (pricing handled at show level)

### 3. **Smart Seat Naming**
Seats are automatically named using the format: `[Section][Row][Seat]`
- Example: `NA1` = North section, Row A, Seat 1
- Example: `EB5` = East section, Row B, Seat 5

### 4. **Visual Layout Preview**
- Real-time preview of the theater layout
- Color-coded sections for easy identification
- Shows seat counts and revenue potential

## How to Create a Layout

### Step 1: Access Layout Management
1. Navigate to **Layouts** page
2. Click **"Create Layout"** button

### Step 2: Configure Basic Settings
1. Enter a **Layout Name** (e.g., "Main Hall Layout")
2. The system starts with 4 default sections

### Step 3: Customize Each Section
For each section, configure:

#### Section Basic Settings
- **Section Name**: Custom name for the section

#### Individual Row Configuration ⭐ NEW!
For each row in the section:
- **Row Letter**: Automatically assigned (A, B, C, D...)
- **Seat Count**: Set individual number of seats for this specific row (0-30)
- **Add/Remove Rows**: Use + Add Row button or trash icon to manage rows

#### Example: Realistic North Section
```
Row A (closest to stage): 10 seats
Row B: 12 seats  
Row C: 14 seats
Row D: 16 seats
Row E (furthest): 16 seats
```

This creates a natural theater curve where front rows have fewer seats and back rows have more.

### Step 4: Review Layout Summary
The system automatically calculates:
- **Total Seats**: Sum of all sections
- **Maximum Revenue**: Full house revenue potential
- **Average Price**: Weighted average ticket price
- **Section Count**: Number of configured sections

### Step 5: Save Layout
Click **"Create Layout"** to save your configuration

## Example Configuration

### Kalari Theater Style Layout with Individual Rows
```
North Section @ ₹100:
  Row A: 16 seats
  Row B: 16 seats  
  Row C: 14 seats
  Row D: 12 seats
  Row E: 10 seats
  Total: 68 seats

South Section @ ₹150:
  Row A: 12 seats
  Row B: 12 seats
  Row C: 10 seats  
  Row D: 8 seats
  Row E: 6 seats
  Total: 48 seats

East Section @ ₹200:
  15 rows × 2 seats each = 30 seats

West Section @ ₹200:  
  15 rows × 2 seats each = 30 seats

Total: 176 seats
Max Revenue: ₹25,600
```

## Advanced Features

### Dynamic Section Management
- **Add Sections**: Click "+ Add Section" to create additional seating areas
- **Remove Sections**: Use trash icon to remove unwanted sections
- **Reorder Sections**: Sections maintain their spatial relationship

### Pricing Strategy
- **Premium Seating**: East/West sections typically priced higher (closer to stage)
- **Standard Seating**: North/South sections for general audience
- **Flexible Pricing**: Each section can have different pricing tiers

### Layout Validation
The system automatically:
- Prevents invalid configurations (0 rows/seats)
- Calculates realistic capacity limits
- Shows revenue projections in real-time

## Booking Integration

### Seat Selection Process
1. **Show Selection**: Choose from available shows
2. **Visual Seat Map**: Interactive 360° seat map display
3. **Section-Based Selection**: Click seats in any section
4. **Real-Time Availability**: Booked seats shown in red
5. **Multi-Section Booking**: Select seats across different sections

### Seat Map Display
- **North**: Horizontal rows at top
- **South**: Horizontal rows at bottom  
- **East**: Vertical columns on right
- **West**: Vertical columns on left
- **Central Stage**: Kalari stage in the center

### Booking Features
- **Smart Seat Naming**: Clear seat identification (NA1, SB3, etc.)
- **Price Display**: Hover to see seat price
- **Section Grouping**: Seats organized by section
- **Mobile Responsive**: Swipe to navigate on mobile devices

## Best Practices

### Layout Design
1. **Start Simple**: Begin with 4 basic sections
2. **Consider Sightlines**: Ensure all seats have good stage view
3. **Price Strategically**: Premium seats closer to stage
4. **Test Booking**: Create test bookings to verify layout

### Capacity Planning
- **Fire Safety**: Ensure compliance with local regulations
- **Accessibility**: Plan for wheelchair accessible seating
- **Emergency Exits**: Consider evacuation routes
- **Comfort**: Allow adequate space between rows

### Pricing Strategy
- **Market Research**: Compare with similar venues
- **Dynamic Pricing**: Different prices for different sections
- **Special Events**: Adjust pricing for premium shows
- **Group Discounts**: Consider bulk booking strategies

## Technical Implementation

### Database Structure
```sql
layouts: {
  id: uuid,
  name: string,
  structure: {
    sections: [
      {
        name: string,
        rows: number,
        seatsPerRow: number,
        price: number
      }
    ]
  }
}
```

### Seat Generation Algorithm
1. **Section Iteration**: Loop through each section
2. **Row Generation**: Create rows A, B, C... up to specified count
3. **Seat Numbering**: Number seats 1, 2, 3... in each row
4. **ID Generation**: Create unique seat IDs for booking system
5. **Price Assignment**: Apply section-specific pricing

This enhanced system provides complete flexibility for creating theater layouts that match your specific venue requirements while maintaining an intuitive user experience for both administrators and customers.