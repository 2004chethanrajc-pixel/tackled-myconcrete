# Construction Management Mobile App

React Native mobile application for Construction Management System.

## Tech Stack

- React Native (Expo)
- React Navigation (Stack)
- Axios
- Context API (Auth State)
- AsyncStorage (JWT Storage)

## Project Structure

```
src/
├── app/                    # Navigation
│   ├── AppNavigator.js     # Root navigator (auth check)
│   ├── AuthNavigator.js    # Login flow
│   └── MainNavigator.js    # Role-based home screens
├── features/               # Feature modules
│   └── auth/
│       ├── screens/        # Login & Home screens
│       ├── api.js          # Auth API calls
│       ├── hooks.js        # useLogin hook
│       └── validation.js   # Form validation
├── components/
│   └── common/             # Reusable components
├── services/
│   ├── apiClient.js        # Axios instance with interceptor
│   └── storage.js          # AsyncStorage wrapper
├── context/
│   └── AuthContext.js      # Auth state management
├── hooks/
│   └── useAuth.js          # Auth context hook
├── utils/
│   └── roleHelper.js       # Role-based routing
└── theme/
    ├── colors.js
    └── typography.js
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start the App

**Easiest way** (Windows):
```bash
# Double-click start.bat file
# OR run in terminal:
npm start
```

**Alternative** (if LAN mode doesn't work):
```bash
# Double-click start-tunnel.bat file
# OR run in terminal:
npm run start:tunnel
```

### 3. Open on Your Phone

1. Install **Expo Go** app from [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or [App Store](https://apps.apple.com/app/expo-go/id982107779)
2. Make sure phone and computer are on **SAME WiFi network**
3. Scan the QR code shown in terminal
4. App will load on your phone

**Important**: Backend must be running first!
```bash
cd backend
npm run dev
```

### Quick Start Files

For convenience, use these files:
- `start.bat` - Start with LAN mode (recommended)
- `start-tunnel.bat` - Start with tunnel mode (if LAN doesn't work)
- `start.ps1` - PowerShell version with cache clearing

See `HOW_TO_START.md` for detailed instructions.

## Phase 1 - Authentication (COMPLETED)

### Features Implemented

✅ Login Screen with email/password validation
✅ JWT token storage in AsyncStorage
✅ User data storage in AsyncStorage
✅ Auth state management with Context API
✅ Axios interceptor for automatic token attachment
✅ Auto-logout on 401 responses
✅ Role-based navigation to home screens:
  - super_admin → SuperAdminHome
  - admin → AdminHome
  - project_manager → PMHome
  - site_incharge → SiteHome
  - customer → CustomerHome
  - finance → FinanceHome

### Testing Login

Use credentials from your backend database. Example:

```
Email: admin@example.com
Password: [your password]
```

After successful login, you'll be redirected to the appropriate home screen based on your role.

### Security Features

- JWT stored securely in AsyncStorage
- Password never stored locally
- Automatic token attachment via interceptor
- Auto-logout on 401 (unauthorized)
- Role-based access control

## Next Steps

Phase 2 will implement read-only dashboards for each role.

## Troubleshooting

### Cannot connect to backend

1. Make sure backend is running on `http://localhost:3000`
2. Update BASE_URL in `src/services/apiClient.js` with correct IP
3. For Android emulator, use `10.0.2.2` instead of `localhost`
4. For physical device, use your computer's local IP address

### Login fails with network error

1. Check backend is accessible from your device/emulator
2. Verify CORS is enabled on backend
3. Check firewall settings

### App crashes on startup

1. Clear cache: `expo start -c`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check all imports are correct
