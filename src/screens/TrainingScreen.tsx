import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";

interface TrainingScreenProps {
  onComplete: () => void;
}

export default function TrainingScreen({ onComplete }: TrainingScreenProps) {
  const [stage, setStage] = useState<"speaking" | "continue">("speaking");
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(50)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  // Blinking animation for "click to continue"
  useEffect(() => {
    if (stage === "continue") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [stage]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Start speaking on mount
  useEffect(() => {
    speakTrainingMessage();
  }, []);

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
    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.split(" ").length, 0);
    const msPerWord = audioDurationMs / totalWords;

    // Set opacity to 1 at the start
    subtitleOpacity.setValue(1);
    subtitleTranslateY.setValue(0);

    for (let i = 0; i < chunks.length; i++) {
      const wordCount = chunks[i].split(" ").length;
      const duration = wordCount * msPerWord;

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
      if (status.isLoaded && status.durationMillis && onDurationReady) {
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

  const speakTrainingMessage = async () => {
    setStage("speaking");
    const trainingText =
      "Your agent looks impressive, but it still needs a brain. What sets our agents apart is that each one is built by you in real time. From the moment it's created, it learns only from the information you provide, allowing it to become a perfectly tailored salesperson designed exclusively for your business. Now it's time to train your agent—teach it everything about your company and include as much detail as possible so it can truly represent your brand.";

    const chunks = splitIntoChunks(trainingText);

    // Start audio playback and capture duration
    let subtitlesStarted = false;

    const audioPromise = new Promise<void>((resolve) => {
      playElevenLabsAudio(
        trainingText,
        resolve,
        (duration) => {
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
      setStage("continue");
    }, 400);
  };

  const handleContinue = () => {
    onComplete();
  };

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

  if (stage === "continue") {
    return (
      <Pressable
        onPress={handleContinue}
        className="flex-1 bg-white items-center justify-end pb-20"
      >
        <Animated.Text
          style={{
            fontSize: 24,
            color: "white",
            textShadowColor: "black",
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 1,
            opacity: blinkAnim,
          }}
        >
          click the screen to continue
        </Animated.Text>
      </Pressable>
    );
  }

  return null;
}
