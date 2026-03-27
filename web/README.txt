================================================================================
                    MYCONCRETE V2 - WEB APPLICATION
                    Admin Portal for Desktop Access
================================================================================

OVERVIEW
================================================================================
This is the web-based admin portal for MyConcrete V2. It provides desktop
access for Admin, Super Admin, and Finance Manager roles only.

Other roles (Project Manager, Site Incharge, Customer) must use the mobile app.


TECHNOLOGY STACK
================================================================================
- React 18.2.0
- React Router DOM 6.20.0
- Axios for API calls
- CSS for styling


SETUP INSTRUCTIONS
================================================================================

1. Navigate to web directory:
   cd myconcrete_v2/web

2. Install dependencies:
   npm install

3. Start development server:
   npm start

4. Open browser:
   http://localhost:3000

5. Login with admin credentials


ALLOWED ROLES
================================================================================
✅ Super Admin
✅ Admin
✅ Finance Manager

❌ Project Manager (use mobile app)
❌ Site Incharge (use mobile app)
❌ Customer (use mobile app)


PROJECT STRUCTURE
================================================================================

web/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── Header.js           # Top navigation bar
│   │   ├── Sidebar.js          # Left sidebar menu
│   │   ├── Layout.js           # Main layout wrapper
│   │   └── PrivateRoute.js     # Protected route component
│   ├── contexts/
│   │   └── AuthContext.js      # Authentication context
│   ├── pages/
│   │   ├── Login.js            # Login page
│   │   ├── Dashboard.js        # Dashboard with stats
│   │   ├── Projects.js         # Projects management
│   │   ├── Users.js            # User management
│   │   ├── Payments.js         # Payment management
│   │   ├── Quotations.js       # Quotation management
│   │   └── Reports.js          # Reports and analytics
│   ├── App.js                  # Main app component
│   ├── App.css                 # App styles
│   ├── index.js                # Entry point
│   └── index.css               # Global styles
├── package.json                # Dependencies
└── README.txt                  # This file


FEATURES
================================================================================

IMPLEMENTED:
✅ Login page with role validation
✅ Dashboard with project statistics
✅ Sidebar navigation
✅ Header with user info and logout
✅ Protected routes
✅ Role-based menu items
✅ Responsive layout

TO BE IMPLEMENTED:
⏳ Projects list and management
⏳ User CRUD operations
⏳ Payment verification
⏳ Quotation approval
⏳ Reports and analytics
⏳ Search and filters
⏳ Data tables
⏳ Forms for creating/editing


CONFIGURATION
================================================================================

API Base URL:
- Default: http://localhost:5000/api/v1
- Update in: src/contexts/AuthContext.js

Theme Colors:
- Primary: #1A237E (Dark Navy Blue)
- Accent: #B8860B (Dark Gold)
- Background: #f5f5f5 (Light Gray)


DEVELOPMENT
================================================================================

To add new pages:
1. Create component in src/pages/
2. Add route in src/App.js
3. Add menu item in src/components/Sidebar.js

To add API calls:
1. Use axios with token from localStorage
2. Handle errors appropriately
3. Show loading states


BUILD FOR PRODUCTION
================================================================================

1. Build the app:
   npm run build

2. Deploy the build/ folder to your web server

3. Configure environment variables for production API URL


NOTES
================================================================================

- This is a basic structure to get started
- Each page needs to be fully implemented with API integration
- Add proper error handling and loading states
- Implement data tables for lists
- Add forms for create/edit operations
- Consider adding a UI library like Material-UI or Ant Design


================================================================================
