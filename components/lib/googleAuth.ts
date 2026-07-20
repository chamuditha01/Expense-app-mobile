import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '448652572609-4bot51p3ga9jt6rn9l3l2qu2kjamk49b.apps.googleusercontent.com', // Web client ID, NOT iOS/Android
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // optional if set in Info.plist via plugin
  offlineAccess: true,
});