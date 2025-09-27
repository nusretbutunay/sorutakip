# Soru Takip - Study Tracker App

A Turkish study tracker application built with Next.js and Firebase for tracking daily question-solving progress across different subjects.

## Features

- 🔐 **User Authentication** - Secure login/registration with Firebase Auth
- 📊 **Progress Tracking** - Track correct, wrong, and empty answers by subject
- 🎯 **Goal Setting** - Set and modify daily targets for each subject
- 📈 **Statistics** - View daily, weekly, and all-time progress
- 🔄 **Cloud Sync** - Data synchronized across devices with Firestore
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive** - Works on desktop and mobile devices

## Tech Stack

- **Framework:** Next.js 14
- **Authentication:** Firebase Auth
- **Database:** Cloud Firestore
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **TypeScript:** Full type safety

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd sorutakip
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password provider
3. Create a Firestore database in test mode
4. Get your Firebase configuration from Project Settings

### 3. Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Fill in your Firebase configuration in `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

### Vercel Deployment

1. Push your code to GitHub (make sure .env.local is in .gitignore)
2. Connect your repository to [Vercel](https://vercel.com/)
3. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all the NEXT_PUBLIC_FIREBASE_* variables

### Other Platforms

For other hosting platforms, ensure you:
1. Set the environment variables in your hosting platform
2. Build the project with `npm run build`
3. Deploy the generated files

## Security Notes

- All Firebase API keys are stored in environment variables
- .env.local is excluded from version control
- Firestore security rules should be configured for production
- Never commit API keys to your repository

## Production Security Rules

For production, update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /userProgress/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /dailyHistory/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.