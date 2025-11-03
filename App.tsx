import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAvatarCreatorUrl } from "./src/hooks/use-avatar-creator-url";
import {
  AssetUnlockedEvent,
  AvatarCreatorEvent,
  AvatarExportedEvent,
  UserAuthorizedEvent,
  UserSetEvent,
  UserUpdatedEvent,
  UserLoggedOutEvent,
} from "./src";
import AvatarPage from "./src/pages/avatar";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import TrainingScreen from "./src/screens/TrainingScreen";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

const RPM_TARGET = "readyplayerme";

// Replace with your custom subdomain
const subdomain = "demo";

export default function App() {
  const webView = useRef<WebView | null>(null);
  const url = useAvatarCreatorUrl(subdomain, {});

  const [avatarId, setAvatarId] = useState<string>();
  const [userName, setUserName] = useState<string>();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTraining, setShowTraining] = useState(false);

  const supportedEvents = {
    "v1.avatar.exported": onAvatarExported,
    "v1.user.set": onUserSet,
    "v1.user.authorized": onUserAuthorized,
    "v1.asset.unlock": onAssetUnlocked,
    "v1.user.updated": onUserUpdated,
    "v1.user.logout": onUserLoggedOut,
  } as Record<string, any>;

  function onAvatarExported(message: AvatarExportedEvent) {
    setAvatarId(message.data.avatarId);
  }

  function onAssetUnlocked(message: AssetUnlockedEvent) {
    console.log(`Asset Unlocked | Asset ID = ${message.data?.assetId}`);
  }

  function onUserAuthorized(message: UserAuthorizedEvent) {
    console.log(`User Authorized | User ID = ${message.data?.id}`);
  }

  function onUserSet(message: UserSetEvent) {
    console.log(`User Set | User ID = ${message.data?.id}`);
  }

  function onUserUpdated(message: UserUpdatedEvent) {
    console.log(`User Updated | User ID = ${message.data?.id}`);
  }

  function onUserLoggedOut(message: UserLoggedOutEvent) {
    console.log("User Logged Out");
  }

  function onWebViewLoaded() {
    webView.current?.postMessage(
      JSON.stringify({
        target: "readyplayerme",
        type: "subscribe",
        eventName: "v1.**",
      })
    );
  }

  function onMessageReceived(message: WebViewMessageEvent) {
    const data = message.nativeEvent.data;
    const event = JSON.parse(data) as AvatarCreatorEvent;

    if (event?.source !== RPM_TARGET || !event.eventName) {
      return;
    }

    supportedEvents[event.eventName]?.(event);
  }

  const handleWelcomeComplete = (firstName: string) => {
    setUserName(firstName);
    setShowWelcome(false);
  };

  const handleShowTraining = () => {
    setShowTraining(true);
  };

  const handleTrainingComplete = () => {
    // Restart the flow
    setShowTraining(false);
    setAvatarId(undefined);
    setUserName(undefined);
    setShowWelcome(true);
  };

  if (showTraining) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <TrainingScreen onComplete={handleTrainingComplete} />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (showWelcome) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <WelcomeScreen onComplete={handleWelcomeComplete} />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (avatarId) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AvatarPage
            clearAvatar={() => setAvatarId("")}
            avatarId={avatarId}
            userName={userName || "there"}
            onShowTraining={handleShowTraining}
          />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <WebView
          ref={webView}
          style={{ marginTop: 30 }}
          onLoad={onWebViewLoaded}
          onMessage={onMessageReceived}
          source={{ uri: url }}
        />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
