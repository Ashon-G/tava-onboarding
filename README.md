# Ready Player Me Avatar Creator with AI Welcome & 3D Display

This React Native app features an AI-powered welcome experience that greets users, then integrates Ready Player Me's avatar creator and displays the created avatar in an interactive 3D viewer with animations.

## Features

- **AI Welcome Experience**: Tava, an AI assistant, greets users with a voice introduction and collects their name
  - Professional Siri-like voice using ElevenLabs Aria voice
  - Text-to-speech playback using WebView for audio processing
  - Smooth countdown animation before introduction
  - Animated text input for name collection
- **Avatar Creation**: Full Ready Player Me avatar creator interface
- **3D Avatar Display**: View your created avatar in a fully interactive 3D environment
- **Particle Effects**: Beautiful floating particles that animate around your avatar
- **Grid Floor**: Cyberpunk-style grid floor underneath the avatar
- **Visible Spotlight**: Stage-style spotlight fixture at the top with visible light beam cone for show
- **Dance Animation**: Avatars spawn with a dance animation from the Ready Player Me animation library (when available)
- **Accept Button**: After viewing the avatar, users can click "Accept" to activate the avatar
- **Talking Animation**: Upon acceptance, the avatar switches to a talking animation and greets the user by name
- **Camera Zoom**: When accepted, the camera zooms in to show only the top half of the avatar (portrait view)
- **Gender-Appropriate Voice**: Uses male or female voice based on avatar gender for the greeting
- **Interactive Controls**:
  - Pinch to zoom in/out
  - Drag to rotate the avatar
  - Beautiful sunset environment lighting
  - Animated particles slowly rotating around the scene

## Project Structure

```
/home/user/workspace
├── src/
│   ├── components/
│   │   └── Avatar3D.tsx          # 3D avatar renderer with animations
│   ├── screens/
│   │   └── WelcomeScreen.tsx     # AI welcome screen with voice intro
│   ├── pages/
│   │   └── avatar.tsx             # Avatar display page (now with 3D)
│   ├── hooks/
│   │   ├── use-avatar-creator-url.ts
│   │   └── use-2d-image-url.ts
│   ├── utils/
│   │   └── audioProcessor.ts     # WebView HTML generator for audio playback
│   ├── events/                    # Ready Player Me event handlers
│   └── types.ts                   # TypeScript types
├── assets/
│   └── animations/
│       └── dance.glb              # M_Dances_001 from RPM animation library
└── App.tsx                        # Main app entry with welcome screen & RPM WebView

```

## How It Works

1. **Welcome Screen**: The app opens with Tava, an AI assistant that introduces itself using ElevenLabs text-to-speech
   - User clicks to start, sees countdown with "VOLUME ON" prompt
   - AI speaks introduction with subtitles
   - User enters their name after introduction
   - AI greets user by name before proceeding
2. **Avatar Creation**: App transitions to Ready Player Me's avatar creator in a WebView
3. **Avatar Export**: When you finish creating an avatar, it exports the avatar ID
4. **3D Display**: The app transitions to a 3D view showing your avatar with a dance animation
5. **Accept Avatar**: User can click the "Accept" button at the bottom of the screen
6. **Avatar Activation**: Upon acceptance:
   - The animation switches from dance to talking
   - The camera zooms in to show only the top half of the avatar (portrait view)
   - The avatar speaks: "Hello [First Name]! Looking forward to working together!"
   - Voice gender matches the avatar (male or female voice)
7. **Continue Prompt**: After the greeting, a blinking "click the screen to continue" message appears
8. **Training Message**: When the user taps the screen, Tava appears on a white screen with subtitles and explains:
   - "Your agent looks impressive, but it still needs a brain..."
   - Instructions about training the agent with business information
9. **Restart Flow**: After the training message, another "click to continue" prompt appears
10. **Loop**: When user taps again, the entire flow restarts from the welcome screen

## Technical Details

- **Text-to-Speech**: ElevenLabs API with multiple voices:
  - Aria voice (professional, Siri-like neutral voice) for Tava AI assistant
  - Chris voice (masculine, professional) for male avatars
  - Rachel voice (feminine, professional) for female avatars
- **Audio Playback**: WebView-based audio processing with base64 encoded MP3 files
- **Audio Processing**: Custom HTML generator creates playback interface that communicates with React Native via postMessage
- **3D Rendering**: Uses Three.js in a WebView for reliable cross-platform 3D rendering
- **3D Controls**: OrbitControls for interactive camera manipulation
- **Avatar Loading**: Avatars are loaded from `https://models.readyplayer.me/{avatarId}.glb`
- **Animations**:
  - Dance animation (M_Dances_001) for initial avatar display
  - Talking animation (M_Talking_Variations_001) for avatar greeting after acceptance
  - Smooth camera transitions when switching between modes
- **WebView Implementation**: Embeds a complete Three.js scene in HTML for maximum compatibility
- **Lighting**: Ambient light, directional light, and point light for realistic rendering
- **Message Passing**: React Native communicates with WebView via postMessage to trigger animation switches and camera movements

## Recent Changes

- Imported Ready Player Me React Native example repository
- Replaced 2D avatar image display with full 3D model viewer
- Initially tried @react-three/fiber but encountered black screen issues in React Native
- **Fixed black screen issue** by switching to WebView-based Three.js implementation
- Attempted to add dance animation from Ready Player Me animation library
- Implemented interactive camera controls (zoom, rotate)
- Added beautiful gradient background with proper lighting
- Created Avatar3D component using WebView for reliable 3D rendering across all devices
- **Fixed avatar scaling** - Reduced scale from 2x to 1x for proper display, then moved camera back for smaller appearance
- **Fixed camera positioning** - Adjusted camera distance to 3.5 units for better avatar sizing
- **Added particle system** - 100 small cyan rounded particles with radial gradient texture, floating and rising around the avatar with additive blending
- **Added grid floor** - Cyberpunk-style 10x10 grid with 20 divisions in cyan and dark teal colors, with semi-transparent dark blue plane underneath
- **Added visible spotlight prop** - Stage-style spotlight fixture with metallic housing, very narrow focused light beam cone (0.5 unit wide at floor) extending down to the grid floor, tightly spotlighting the avatar
- Avatar is well-lit from all angles with ambient, directional, and point lights
- Animation loading is attempted but may fail due to CORS/CDN issues (avatar still fully interactive)
- **Added AI Welcome Screen** - Created WelcomeScreen component with Tava AI assistant
- **Integrated ElevenLabs TTS** - Using Aria voice (professional, Siri-like) for AI speech
- **Removed audio recording** - Simplified to text input only for user interaction
- **Audio playback via WebView** - Implemented custom audio processor using WebView and base64 encoding
- **Added Accept Button** - Users can now accept their avatar after viewing it
- **Implemented Avatar Greeting** - After acceptance, avatar switches to talking animation and greets user
- **Added Camera Zoom** - Camera zooms to portrait view (top half only) when avatar is accepted
- **Gender-Based Voice Selection** - Avatar uses appropriate male or female voice for greeting
- **Two-Stage Animation System** - Dance animation for preview, talking animation for acceptance
- **Added Continue Prompt** - Blinking "click the screen to continue" appears after avatar greeting
- **Created Training Screen** - Tava returns with white screen and subtitles to explain agent training
- **Implemented Restart Flow** - After training message, the entire flow loops back to the beginning
- **Complete User Journey Loop** - Full circular flow from welcome → avatar creation → acceptance → training → restart
- **Synchronized Subtitles** - Subtitles now appear in real-time as the AI speaks, synchronized with audio duration
