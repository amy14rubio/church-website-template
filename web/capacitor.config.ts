import type { CapacitorConfig } from '@capacitor/cli'

// appId is a reverse-DNS identifier baked into the Android build
// (applicationId in android/app/build.gradle) and the Java package
// folder structure under android/app/src/main/java/ — easy to rename
// later (see Capacitor's own docs on changing the app id/package name),
// but harder the further along the native project gets, so worth
// deciding for real before shipping to the Play Store rather than
// keeping this placeholder.
const config: CapacitorConfig = {
  appId: 'com.example.church',
  appName: 'Iglesia',
  // Vite's own build output — `npm run build` before `npx cap sync`
  // copies this into the native project, same as any other Capacitor +
  // Vite app.
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      // Only load the Google provider's native SDK — this app doesn't
      // use Apple/Facebook/etc. sign-in, so there's no reason to link
      // those SDKs into the app too.
      providers: ['google.com'],
      // Leave the native layer's own Firebase Auth session in place
      // (skipNativeAuth: false, the default) — LoginPage bridges its
      // ID token into the Firebase JS SDK session with
      // signInWithCredential so the rest of the app (which only reads
      // the JS SDK's auth state) behaves identically on native and web.
      skipNativeAuth: false,
    },
  },
  // iOS-only Swift Package Manager settings required by
  // @capacitor-firebase/authentication (see its README):
  // - packageOptions.symlink avoids a package-identity collision with
  //   another SPM package of the same name.
  // - packageTraits restricts it to the Google trait only, so the
  //   Facebook SDK it also ships (unused here) never gets linked in.
  experimental: {
    ios: {
      spm: {
        // Required whenever packageTraits is used (Capacitor errors out
        // on sync otherwise): SPM package traits need Swift tools 6.1+.
        swiftToolsVersion: '6.1',
        packageOptions: {
          '@capacitor-firebase/authentication': {
            symlink: true,
          },
        },
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google'],
        },
      },
    },
  },
}

export default config
