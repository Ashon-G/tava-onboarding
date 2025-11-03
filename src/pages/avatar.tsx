import { type FC, useState, useRef, useEffect } from "react";
import { Pressable, Text, View, Animated } from "react-native";
import Avatar3D from "../components/Avatar3D";

interface AvatarPageProps {
  avatarId: string;
  clearAvatar: () => void;
  userName: string;
  onShowTraining: () => void;
}

const AvatarPage: FC<AvatarPageProps> = ({ avatarId, clearAvatar, userName, onShowTraining }) => {
  const [accepted, setAccepted] = useState(false);
  const [greetingComplete, setGreetingComplete] = useState(false);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Blinking animation for "click to continue"
  useEffect(() => {
    if (greetingComplete) {
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
  }, [greetingComplete]);

  const handleAccept = () => {
    setAccepted(true);
  };

  const handleGreetingComplete = () => {
    setGreetingComplete(true);
  };

  const handleContinue = () => {
    onShowTraining();
  };

  return (
    <Pressable
      onPress={greetingComplete ? handleContinue : undefined}
      style={{ flex: 1 }}
    >
      <View className="flex-1">
        <Avatar3D
          avatarId={avatarId}
          accepted={accepted}
          userName={userName}
          onGreetingComplete={handleGreetingComplete}
        />

        {!accepted && (
          <View className="absolute bottom-12 left-0 right-0 items-center z-10">
            <Pressable
              onPress={handleAccept}
              className="bg-blue-500 px-8 py-4 rounded-full shadow-lg"
            >
              <Text className="text-white font-semibold text-lg">Accept</Text>
            </Pressable>
          </View>
        )}

        {greetingComplete && (
          <View className="absolute bottom-20 left-0 right-0 items-center z-10">
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
          </View>
        )}

        <View className="absolute top-12 left-0 right-0 items-center z-10">
          <Pressable
            onPress={clearAvatar}
            className="bg-white/90 px-6 py-3 rounded-full shadow-lg"
          >
            <Text className="text-gray-900 font-semibold">Change Avatar</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export default AvatarPage;
