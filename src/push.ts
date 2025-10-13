export async function askNotificationPermission() {
  if (!('Notification' in window))
    throw new Error('No soporta Notification API');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permiso denegado');
  return perm;
}

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function subscribeToPush(vapidPublicKeyBase64: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    throw new Error('Push no soportado');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(vapidPublicKeyBase64),
  });
  return sub; // envíalo a tu backend para guardarlo
}
