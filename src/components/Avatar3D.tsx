import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import WebView from "react-native-webview";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";

interface Avatar3DProps {
  avatarId: string;
  accepted?: boolean;
  userName?: string;
  onGreetingComplete?: () => void;
}

export default function Avatar3D({ avatarId, accepted = false, userName = "there", onGreetingComplete }: Avatar3DProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const [hasPlayedGreeting, setHasPlayedGreeting] = useState(false);

  // Detect gender from avatar - ReadyPlayerMe avatars have gender info in their JSON metadata
  const [avatarGender, setAvatarGender] = useState<"male" | "female">("male");

  useEffect(() => {
    // Detect gender by fetching avatar metadata from RPM API
    const detectGender = async () => {
      try {
        // Ready Player Me provides a JSON metadata endpoint
        const response = await fetch(`https://models.readyplayer.me/${avatarId}.json`);
        if (response.ok) {
          const metadata = await response.json();
          // Check the outfit gender or body type
          // RPM typically stores gender in the outfitGender field
          if (metadata.outfitGender === "feminine" || metadata.bodyType === "feminine") {
            setAvatarGender("female");
          } else {
            setAvatarGender("male");
          }
          console.log("Avatar gender detected:", metadata.outfitGender || metadata.bodyType);
        } else {
          // Fallback: if metadata endpoint doesn't work, default to male
          console.log("Could not fetch avatar metadata, defaulting to male voice");
          setAvatarGender("male");
        }
      } catch (e) {
        console.log("Error detecting gender:", e);
        setAvatarGender("male");
      }
    };
    detectGender();
  }, [avatarId]);

  useEffect(() => {
    if (accepted && webViewRef.current && !hasPlayedGreeting) {
      setHasPlayedGreeting(true);

      // Send message to WebView to switch animation and zoom camera
      webViewRef.current.postMessage(JSON.stringify({
        action: "switchToTalking",
      }));

      // Play TTS greeting
      playGreeting();
    }
  }, [accepted, webViewRef.current]);

  const playGreeting = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const greetingText = `Hello ${userName}! Looking forward to working together!`;

      // Use appropriate voice based on gender
      // Male voice: Chris (masculine, professional)
      // Female voice: Rachel (feminine, professional)
      const voiceId = avatarGender === "male" ? "iP95p4xoKVk53GoZ742B" : "21m00Tcm4TlvDq8ikWAM";

      const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: greetingText,
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

      const audioBuffer = await response.arrayBuffer();
      const fileUri = `${FileSystem.cacheDirectory}avatar_greeting.mp3`;
      const base64Audio = btoa(
        new Uint8Array(audioBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          // Notify that greeting is complete
          if (onGreetingComplete) {
            onGreetingComplete();
          }
        }
      });
    } catch (error) {
      console.error("Error playing greeting:", error);
      // Even if there's an error, call the callback
      if (onGreetingComplete) {
        onGreetingComplete();
      }
    }
  };

  const avatarUrl = `https://models.readyplayer.me/${avatarId}.glb`;
  // Default dance animation
  const danceAnimationUrl =
    "https://cdn.jsdelivr.net/gh/readyplayerme/animation-library@master/masculine/glb/dance/M_Dances_001.glb";
  // Talking animation for when user accepts
  const talkingAnimationUrl =
    "https://cdn.jsdelivr.net/gh/readyplayerme/animation-library@master/masculine/glb/expression/M_Talking_Variations_001.glb";

  // Create an HTML page that uses Three.js to display the 3D avatar
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: linear-gradient(to bottom, #60a5fa, #ffffff);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #avatar-container {
      width: 100%;
      height: 100%;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 18px;
      text-align: center;
      z-index: 100;
    }
    .instructions {
      position: absolute;
      bottom: 80px;
      left: 0;
      right: 0;
      text-align: center;
      color: white;
      font-size: 14px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s;
      z-index: 50;
    }
    .instructions.visible {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div id="avatar-container"></div>
  <div id="loading">Loading 3D viewer...</div>
  <div class="instructions">Drag left or right to rotate</div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>

  <script>
    (function() {
      try {
        console.log('Starting Three.js initialization...');
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('Starting initialization');

        const container = document.getElementById('avatar-container');
        const loadingEl = document.getElementById('loading');
        const instructionsEl = document.querySelector('.instructions');

        if (!THREE) {
          throw new Error('Three.js failed to load');
        }

        console.log('Three.js version:', THREE.REVISION);
        loadingEl.textContent = 'Setting up 3D scene...';

        // Setup scene
        const scene = new THREE.Scene();

        // Setup camera
        const camera = new THREE.PerspectiveCamera(
          50,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        camera.position.set(0, 0.8, 3.5);

        // Setup renderer
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        console.log('Renderer created');
        loadingEl.textContent = 'Setting up lights...';

        // Setup lights - bright all around for good visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        // Create multiple point lights around the avatar in a circle
        const lightDistance = 4;
        const lightHeight = 1.5;
        const numLights = 8;

        for (let i = 0; i < numLights; i++) {
          const angle = (i / numLights) * Math.PI * 2;
          const x = Math.cos(angle) * lightDistance;
          const z = Math.sin(angle) * lightDistance;

          const pointLight = new THREE.PointLight(0xffffff, 0.6);
          pointLight.position.set(x, lightHeight, z);
          scene.add(pointLight);
        }

        // Top light
        const topLight = new THREE.PointLight(0xffffff, 0.8);
        topLight.position.set(0, 5, 0);
        scene.add(topLight);

        // Front directional light for face visibility
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(0, 2, 5);
        scene.add(directionalLight);

        console.log('Lights created');

        // Create particle system
        console.log('Creating particle system...');
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleVelocities = [];

        for (let i = 0; i < particleCount; i++) {
          // Random position in a sphere around the avatar
          const radius = Math.random() * 3 + 1;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;

          particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) - 0.5;
          particlePositions[i * 3 + 2] = radius * Math.cos(phi);

          // Random velocity for each particle
          particleVelocities.push({
            x: (Math.random() - 0.5) * 0.01,
            y: Math.random() * 0.01 + 0.005,
            z: (Math.random() - 0.5) * 0.01
          });
        }

        particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

        // Create a canvas texture for rounded particles
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw a circular gradient
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);

        // Create particle material with texture
        const particleMaterial = new THREE.PointsMaterial({
          map: texture,
          size: 0.04,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
          depthWrite: false
        });

        const particleSystem = new THREE.Points(particles, particleMaterial);
        scene.add(particleSystem);

        console.log('Particle system created');

        // Create grid floor
        console.log('Creating grid floor...');
        const gridSize = 10;
        const gridDivisions = 20;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x004444);
        gridHelper.position.y = -1;
        scene.add(gridHelper);

        // Add a semi-transparent plane under the grid for better visibility
        const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const floorMaterial = new THREE.MeshBasicMaterial({
          color: 0x000033,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.01;
        scene.add(floor);

        console.log('Grid floor created');

        // Setup controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = true;
        controls.minPolarAngle = Math.PI / 2; // Lock vertical rotation
        controls.maxPolarAngle = Math.PI / 2; // Lock vertical rotation
        controls.target.set(0, 0.3, 0);
        controls.update();

        console.log('Controls created');
        loadingEl.textContent = 'Loading avatar model...';

        // Load avatar and animation
        const loader = new THREE.GLTFLoader();
        let mixer;

        // Load avatar
        loader.load(
          '${avatarUrl}',
          function(gltf) {
            console.log('Avatar loaded successfully');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage('Avatar loaded');
            loadingEl.textContent = 'Loading animation...';

            const avatar = gltf.scene;
            avatar.scale.set(1, 1, 1);
            avatar.position.set(0, -1, 0);
            scene.add(avatar);

            // Load animation
            loader.load(
              '${danceAnimationUrl}',
              function(animGltf) {
                console.log('Animation loaded successfully');
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage('Animation loaded');

                if (animGltf.animations && animGltf.animations.length > 0) {
                  mixer = new THREE.AnimationMixer(avatar);
                  const action = mixer.clipAction(animGltf.animations[0]);
                  action.play();
                  console.log('Animation playing');
                }

                loadingEl.style.display = 'none';
                instructionsEl.classList.add('visible');
              },
              function(progress) {
                if (progress.total > 0) {
                  const percent = Math.round((progress.loaded / progress.total) * 100);
                  loadingEl.textContent = 'Loading animation... ' + percent + '%';
                }
              },
              function(error) {
                console.error('Animation load error:', error);
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage('Animation skipped - avatar still interactive!');
                loadingEl.textContent = 'Avatar ready!';
                setTimeout(function() {
                  loadingEl.style.display = 'none';
                  instructionsEl.classList.add('visible');
                }, 1500);
              }
            );
          },
          function(progress) {
            if (progress.total > 0) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              loadingEl.textContent = 'Loading avatar... ' + percent + '%';
            }
          },
          function(error) {
            console.error('Avatar load error:', error);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage('Avatar error: ' + error);
            loadingEl.textContent = 'Failed to load avatar';
            loadingEl.style.color = '#ff6b6b';
          }
        );

        // Animation loop
        const clock = new THREE.Clock();
        function animate() {
          requestAnimationFrame(animate);

          if (mixer) {
            mixer.update(clock.getDelta());
          }

          // Animate particles
          const positions = particles.attributes.position.array;
          for (let i = 0; i < particleCount; i++) {
            positions[i * 3] += particleVelocities[i].x;
            positions[i * 3 + 1] += particleVelocities[i].y;
            positions[i * 3 + 2] += particleVelocities[i].z;

            // Reset particle if it goes too far up
            if (positions[i * 3 + 1] > 3) {
              positions[i * 3 + 1] = -2;
              positions[i * 3] = (Math.random() - 0.5) * 4;
              positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
            }
          }
          particles.attributes.position.needsUpdate = true;

          // Slowly rotate particle system
          particleSystem.rotation.y += 0.001;

          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        console.log('Animation loop started');
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('Scene ready');

        // Handle resize
        window.addEventListener('resize', function() {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Handle messages from React Native
        window.addEventListener('message', function(event) {
          try {
            const message = JSON.parse(event.data);
            if (message.action === 'switchToTalking') {
              console.log('Switching to talking animation and zooming camera...');

              // Zoom camera to show only top half
              camera.position.set(0, 1.2, 2);
              controls.target.set(0, 0.8, 0);
              controls.update();

              // Load talking animation
              loader.load(
                '${talkingAnimationUrl}',
                function(talkingGltf) {
                  console.log('Talking animation loaded');
                  if (talkingGltf.animations && talkingGltf.animations.length > 0 && mixer) {
                    // Stop all current actions
                    mixer.stopAllAction();
                    // Play talking animation
                    const talkAction = mixer.clipAction(talkingGltf.animations[0]);
                    talkAction.play();
                    console.log('Talking animation playing');
                  }
                },
                undefined,
                function(error) {
                  console.error('Talking animation load error:', error);
                }
              );
            }
          } catch (e) {
            console.error('Message parsing error:', e);
          }
        });

      } catch (error) {
        console.error('Fatal error:', error);
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('Fatal error: ' + error.message);
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
          loadingEl.textContent = 'Error: ' + error.message;
          loadingEl.style.color = '#ff6b6b';
        }
      }
    })();
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Initializing 3D viewer...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs={true}
        onLoad={() => {
          console.log("WebView loaded");
          setLoading(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView error:", nativeEvent);
          setError("Failed to load 3D viewer");
          setLoading(false);
        }}
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          console.log("WebView message:", message);

          // Only show error messages if they're actually errors, not just animation skips
          if (message.includes("Failed") || message.includes("Fatal")) {
            setError(message);
          }

          // Clear error if avatar loaded successfully
          if (message.includes("Avatar loaded") || message.includes("Scene ready")) {
            setError(null);
          }
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("HTTP error:", nativeEvent);
        }}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(88, 28, 135, 0.8)",
    zIndex: 10,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: "rgba(255, 107, 107, 0.9)",
    borderRadius: 8,
    zIndex: 10,
  },
  errorText: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center",
  },
});
