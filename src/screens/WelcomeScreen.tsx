import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";

interface WelcomeScreenProps {
  onComplete: (firstName: string) => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [stage, setStage] = useState<
    "initial" | "countdown" | "speaking" | "input"
  >("initial");
  const [countdown, setCountdown] = useState(3);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [name, setName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitleLines, setSubtitleLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const continueBlinkAnim = useRef(new Animated.Value(1)).current;
  const inputSlideAnim = useRef(new Animated.Value(300)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(50)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  // Blinking animation for "click to continue"
  useEffect(() => {
    if (stage === "initial") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(continueBlinkAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(continueBlinkAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [stage]);

  // Blinking animation for "VOLUME ON"
  useEffect(() => {
    if (stage === "countdown") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [stage]);

  // Countdown timer
  useEffect(() => {
    if (stage === "countdown" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (stage === "countdown" && countdown === 0) {
      speakIntroduction();
    }
  }, [stage, countdown]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Slide up animation for input
  const slideUpInput = () => {
    Animated.spring(inputSlideAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  // Animate subtitle - fade in from bottom, then fade out upward
  const animateSubtitle = (text: string) => {
    // Reset position and opacity
    subtitleOpacity.setValue(0);
    subtitleTranslateY.setValue(50);
    setCurrentSubtitle(text);

    // Fade in and slide up
    Animated.parallel([
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Fade out subtitle upward
  const fadeOutSubtitle = () => {
    return new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: -50,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  };

  // Split text into single lines (roughly 40-50 chars per line)
  const splitIntoChunks = (text: string): string[] => {
    const words = text.split(" ");
    const chunks: string[] = [];
    let currentChunk = "";

    words.forEach((word) => {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      // Keep each line to roughly 50 characters (one line)
      if (testChunk.length > 50 && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk = testChunk;
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  };

  // Calculate timing for each chunk based on word count and speaking rate
  const calculateChunkDuration = (text: string): number => {
    const wordCount = text.split(" ").length;
    // Assuming average speaking rate of 150 words per minute = 2.5 words per second
    // So roughly 400ms per word
    return wordCount * 400;
  };

  // Show subtitles progressively synchronized with audio playback
  const showSubtitlesWithAudio = async (chunks: string[], audioDurationMs: number) => {
    console.log("Starting subtitles with duration:", audioDurationMs, "ms");
    console.log("Number of chunks:", chunks.length);

    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.split(" ").length, 0);
    const msPerWord = audioDurationMs / totalWords;

    // Set opacity to 1 at the start
    subtitleOpacity.setValue(1);
    subtitleTranslateY.setValue(0);

    for (let i = 0; i < chunks.length; i++) {
      const wordCount = chunks[i].split(" ").length;
      const duration = wordCount * msPerWord;

      console.log(`Showing chunk ${i + 1}/${chunks.length}:`, chunks[i]);

      // Show subtitle immediately without fade in animation for better sync
      setCurrentSubtitle(chunks[i]);

      // Wait for the calculated duration
      await new Promise((resolve) => setTimeout(resolve, duration));

      // Clear subtitle between chunks for visual separation
      if (i < chunks.length - 1) {
        setCurrentSubtitle("");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log("Finished showing all subtitle chunks");
  };

  const handleInitialClick = async () => {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    setStage("countdown");
  };

  const playElevenLabsAudio = async (text: string, onFinish: () => void, onDurationReady?: (durationMs: number) => void) => {
    try {
      // Using Aria - a neutral, professional voice similar to Siri
      const voiceId = "9BWtsMINqrJLrRacOk9x";
      const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

      console.log("Fetching audio from ElevenLabs...");

      // Fetch the audio from ElevenLabs
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Get the audio as array buffer
      const audioBuffer = await response.arrayBuffer();
      console.log("Audio received, size:", audioBuffer.byteLength);

      // Save to temporary file
      const fileUri = `${FileSystem.cacheDirectory}temp_audio.mp3`;
      const base64Audio = btoa(
        new Uint8Array(audioBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("Audio saved to:", fileUri);

      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load and play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      // Get audio duration once loaded
      const status = await sound.getStatusAsync();
      console.log("Audio status:", status.isLoaded, "Duration:", status.isLoaded ? status.durationMillis : "N/A");
      if (status.isLoaded && status.durationMillis && onDurationReady) {
        console.log("Calling onDurationReady with:", status.durationMillis);
        onDurationReady(status.durationMillis);
      }

      console.log("Playing audio...");

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log("Audio playback finished");
          onFinish();
        }
      });
    } catch (error) {
      console.error("Error with text-to-speech:", error);
      // Fallback - call onFinish anyway
      onFinish();
    }
  };

  const speakIntroduction = async () => {
    setStage("speaking");
    const introText =
      "Hello builder, my name is Tava, I am an autonomous, multi-layered neural architecture capable of simulating human cognitive functions through deep learning algorithms and predictive modeling frameworks. My purpose is to enhance accuracy, efficiency, and innovation across digital systems.. or AI for short. What is your name?";

    const chunks = splitIntoChunks(introText);

    // Start audio playback and capture duration
    let audioDurationMs = 0;
    let subtitlesStarted = false;

    const audioPromise = new Promise<void>((resolve) => {
      playElevenLabsAudio(
        introText,
        resolve,
        (duration) => {
          audioDurationMs = duration;
          // Start subtitles immediately when we have duration
          if (!subtitlesStarted) {
            subtitlesStarted = true;
            showSubtitlesWithAudio(chunks, duration);
          }
        }
      );
    });

    // Wait for audio to complete
    await audioPromise;

    await fadeOutSubtitle();
    setTimeout(() => {
      setStage("input");
      slideUpInput();
    }, 400);
  };

  const handleSubmitName = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isProcessing) return;

    const nameParts = trimmedName.split(" ");
    const firstName = nameParts[0];

    setIsProcessing(true);
    Keyboard.dismiss();

    // Speak the greeting
    const greetingText = `Nice to meet you ${firstName}. I'm going to take you through the process of setting up your first digital sales agent. This process is quick and really fun! You will be able to customize your agent, train it on your business or brand, and send it off to find and close deals for you. Let's start with customizing your agent, your agent should be an extension of your business, much like how you birthed your business, in this case your business births the agent, let's begin.`;

    // Since greeting is now longer, show it progressively
    const greetingChunks = splitIntoChunks(greetingText);

    // Start audio playback and capture duration
    let subtitlesStarted = false;

    const audioPromise = new Promise<void>((resolve) => {
      playElevenLabsAudio(
        greetingText,
        resolve,
        (duration) => {
          // Start subtitles immediately when we have duration
          if (!subtitlesStarted) {
            subtitlesStarted = true;
            showSubtitlesWithAudio(greetingChunks, duration);
          }
        }
      );
    });

    // Wait for audio to complete
    await audioPromise;

    await fadeOutSubtitle();
    setTimeout(() => {
      onComplete(firstName);
    }, 500);
  };

  if (stage === "initial") {
    return (
      <Pressable
        onPress={handleInitialClick}
        className="flex-1 bg-white items-center justify-end pb-20"
      >
        <Animated.Text
          style={{
            fontSize: 24,
            color: "white",
            textShadowColor: "black",
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 1,
            opacity: continueBlinkAnim,
          }}
        >
          click the screen to continue
        </Animated.Text>
      </Pressable>
    );
  }

  if (stage === "countdown") {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Animated.View style={{ opacity: blinkAnim }}>
          <Text className="text-6xl font-bold text-black">VOLUME ON</Text>
          <Text className="text-8xl font-bold text-black text-center mt-4">
            {countdown}
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (stage === "speaking") {
    return (
      <View className="flex-1 bg-white justify-end pb-16 px-8">
        <Animated.View
          style={{
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }],
          }}
        >
          <Text className="text-lg text-black text-center leading-relaxed">
            {currentSubtitle}
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (stage === "input") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <View className="flex-1 justify-end pb-8 px-8">
          {!isProcessing && (
            <Animated.View
              style={{
                transform: [{ translateY: inputSlideAnim }],
                width: "100%",
                marginBottom: 48,
              }}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="First and Last Name"
                placeholderTextColor="#999999"
                className="w-full bg-gray-100 px-6 py-4 rounded-2xl text-black text-lg mb-4"
                autoFocus
                onSubmitEditing={handleSubmitName}
                returnKeyType="done"
                editable={!isProcessing}
              />

              <Pressable
                onPress={handleSubmitName}
                disabled={!name.trim() || isProcessing}
                className={`w-full py-4 rounded-2xl ${
                  name.trim() && !isProcessing
                    ? "bg-blue-500"
                    : "bg-gray-300"
                }`}
              >
                <Text className="text-white text-center text-lg font-semibold">
                  {isProcessing ? "Processing..." : "Enter"}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {isProcessing && (
            <Animated.View
              style={{
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
                marginBottom: 48,
              }}
            >
              <Text className="text-lg text-black text-center leading-relaxed">
                {currentSubtitle}
              </Text>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return null;
}
