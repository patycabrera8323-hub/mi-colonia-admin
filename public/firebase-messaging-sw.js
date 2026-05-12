importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "mi-local-2ac9f",
  appId: "1:760341600295:web:d3d6406752fdfb6cf75602",
  apiKey: "AIzaSyDxR5T2FPw32-NhhcwRwXpANJDV1nYq2E0",
  authDomain: "mi-local-2ac9f.firebaseapp.com",
  storageBucket: "mi-local-2ac9f.firebasestorage.app",
  messagingSenderId: "760341600295"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
