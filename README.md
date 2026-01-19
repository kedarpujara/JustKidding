# JustKidding

A **mobile-only pediatric telemedicine app** for India where parents can book video consultations with certified pediatricians for their children.

## Features

- **Video-Only Consultations**: All consultations are scheduled, paid, in-app video calls
- **Guardian/Child Model**: Parents manage child profiles and book appointments
- **Progressive Intake**: Smart intake forms with conditional questions based on symptoms
- **Push Reminders**: Automatic reminders at 24h, 1h, and 5 min before appointments
- **Digital Prescriptions**: Doctors generate PDF prescriptions after consultations
- **Secure Payments**: Razorpay integration for Indian payments

## Tech Stack

### Frontend (iOS + Android)
- **React Native (Expo)** - Cross-platform mobile framework
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **React Query** - Server state management
- **Zustand** - Client state management
- **Expo Notifications** - Push notifications

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication (Phone OTP)
  - Row Level Security
  - Edge Functions
  - Storage

### Integrations
- **Razorpay** - Payment gateway
- **Agora** - Video calling SDK

## Project Structure

```
JustKidding/
├── src/
│   ├── app/                    # Expo Router screens
│   │   ├── (auth)/            # Authentication screens
│   │   ├── (guardian)/        # Parent/Guardian screens
│   │   ├── (doctor)/          # Doctor screens
│   │   └── (admin)/           # Admin screens
│   ├── components/            # Reusable components
│   │   └── ui/               # Base UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Configuration & utilities
│   ├── services/              # API service layer
│   ├── stores/                # Zustand stores
│   ├── types/                 # TypeScript definitions
│   └── utils/                 # Helper functions
├── supabase/
│   ├── migrations/            # Database migrations
│   ├── functions/             # Edge Functions
│   └── seed/                  # Seed data
└── assets/                    # Images, fonts, etc.
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`npm install -g supabase`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/your-repo/justkidding.git
   cd justkidding
   npm install
   ```

2. **Set up Supabase**
   ```bash
   # Start local Supabase
   supabase start

   # Run migrations
   supabase db reset

   # Deploy Edge Functions (for production)
   supabase functions deploy
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and Razorpay credentials
   ```

4. **Start the app**
   ```bash
   # Start Expo
   npx expo start

   # Press 'i' for iOS or 'a' for Android
   ```

### Environment Variables

Create a `.env` file with:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For Edge Functions (set in Supabase dashboard):
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`

## User Roles

### Guardian (Parent)
- Register with phone OTP
- Add child profiles
- Book video consultations
- Complete intake forms
- Join video calls
- View prescriptions

### Doctor
- Apply and get verified
- Set weekly availability
- Review patient intake
- Conduct video consultations
- Write notes (SOAP format)
- Generate prescriptions

### Admin
- Approve/reject doctors
- Manage appointments
- Handle refunds
- View analytics

## Database Schema

Key tables:
- `profiles` - User accounts
- `children` - Child profiles linked to guardians
- `doctor_profiles` - Doctor-specific data
- `appointments` - Scheduled consultations
- `intake_responses` - Patient intake forms
- `video_sessions` - Video call metadata
- `payments` - Payment records
- `prescriptions` - Generated prescriptions

See `/supabase/migrations` for full schema.

## Edge Functions

| Function | Purpose |
|----------|---------|
| `create-razorpay-order` | Create payment order |
| `razorpay-webhook` | Handle payment callbacks |
| `create-video-room` | Generate video session |
| `send-push-notification` | Send push notifications |

## Appointment Flow

1. Guardian selects child
2. Guardian chooses doctor and time slot
3. Slot is held for 10 minutes
4. Guardian completes progressive intake
5. Guardian pays via Razorpay
6. Appointment confirmed, video room created
7. Reminders sent at 24h, 1h, 5min
8. Video consultation happens
9. Doctor writes notes and prescription
10. PDF prescription available to guardian

## Security

- Row Level Security (RLS) on all tables
- Guardians can only see their own data
- Doctors can only see assigned appointments
- Signed URLs for file access
- Secure token-based video access

## Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

Built for pediatric healthcare in India
