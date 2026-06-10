// Platform fork: native builds drive the OpenAI Realtime session through
// react-native-webrtc; webrtc.web.ts swaps in the browser's own WebRTC stack.
export { RTCPeerConnection, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
