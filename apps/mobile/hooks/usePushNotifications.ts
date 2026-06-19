import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { notificationService } from "@/services/notification.service";
import { toast } from "@/store/useToastStore";
import { resolveDeepLink } from "@/utils/notification-link";

const FALLBACK_ROUTE = "/(protected)/notifications";

async function ensurePermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") {
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#f7f1e8",
  });
}

function handlePushTap(
  data: Record<string, unknown> | null | undefined,
): void {
  const link = (data as { link?: string } | null)?.link;
  const target = resolveDeepLink(link ?? null);
  router.push((target ?? FALLBACK_ROUTE) as any);
}

export function usePushNotifications(): {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
} {
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    receivedSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        toast.showInfo(notification.request.content.title ?? "Notification");
      },
    );
    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data =
          (response.notification.request.content.data as Record<
            string,
            unknown
          >) ?? null;
        handlePushTap(data);
      },
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data =
          (response.notification.request.content.data as Record<
            string,
            unknown
          >) ?? null;
        handlePushTap(data);
      }
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);

  const register = useCallback(async (): Promise<void> => {
    if (!Device.isDevice) {
      return;
    }
    const granted = await ensurePermission();
    if (!granted) {
      return;
    }
    await setupAndroidChannel();
    const projectId =
      (
        Constants.expoConfig?.extra as
          | { eas?: { projectId?: string } }
          | undefined
      )?.eas?.projectId ?? undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await notificationService.registerDevice(tokenResponse.data);
  }, []);

  const unregister = useCallback(async (): Promise<void> => {
    try {
      await notificationService.unregisterDevice();
    } catch {}
  }, []);

  return { register, unregister };
}
