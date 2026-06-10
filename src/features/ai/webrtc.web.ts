// Web half of the WebRTC fork: the browser's own stack speaks the same OpenAI
// Realtime protocol, so the hook code is identical — only the constructors differ.
// (react-native-webrtc has no web implementation; importing it would crash the bundle.)
export const RTCPeerConnection = (globalThis as any).RTCPeerConnection;
export const RTCSessionDescription = (globalThis as any).RTCSessionDescription;
export const mediaDevices = (globalThis as any).navigator?.mediaDevices;
