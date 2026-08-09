import { supabase } from "./supabaseClient.js";

// Web Push subscribe/unsubscribe. Requires VITE_VAPID_PUBLIC_KEY (see
// supabase/functions/send-photo-notification for where the matching
// private key lives) -- without it, notifications are just unsupported,
// not broken.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function notificationsSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
}

// "unsupported" | "denied" | "subscribed" | "unsubscribed"
export async function getNotificationStatus() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "subscribed" : "unsubscribed";
}

export async function enableNotifications() {
  const registration = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const { data: { user } } = await supabase.auth.getUser();
  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function disableNotifications() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

// @mention push -- fire-and-forget, called from CategoryChat.jsx when a
// message names someone. Chat itself is never persisted; this is a
// direct client -> Edge Function call, not a database trigger, since
// there's no row for a trigger to fire on. Swallow failures so a failed
// notification never blocks sending the actual chat message.
export async function notifyMention({ projectId, category, recipientUserId, messageText }) {
  try {
    await supabase.functions.invoke("send-mention-notification", {
      body: { projectId, category, recipientUserId, messageText },
    });
  } catch (err) {
    console.error("Mention notification failed:", err);
  }
}
