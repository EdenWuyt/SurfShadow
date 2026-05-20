import { Capacitor } from '@capacitor/core'
import { CapacitorAudioRecorder } from '@capgo/capacitor-audio-recorder'

function getNativeRecordingUrl(uri: string): string {
  return Capacitor.convertFileSrc(uri)
}

/**
 * Practice recording should use the native recorder inside Capacitor so Android does not depend on WebView MediaRecorder support.
 */
export function canUseNativeRecorder(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Native recording permissions are checked explicitly so the practice hook can keep its existing listen-only fallback.
 */
export async function requestNativeRecorderPermission(): Promise<boolean> {
  const { recordAudio } = await CapacitorAudioRecorder.requestPermissions()
  return recordAudio === 'granted'
}

/**
 * Starts the native microphone recorder on Android/iOS.
 */
export async function startNativeRecording(): Promise<void> {
  await CapacitorAudioRecorder.startRecording({
    bitRate: 192000,
    sampleRate: 44100,
  })
}

/**
 * Stops the native recorder and normalizes the captured file back into a Blob so the existing upload flow can stay unchanged.
 */
export async function stopNativeRecording(): Promise<Blob> {
  const result = await CapacitorAudioRecorder.stopRecording()

  if (result.blob) {
    return result.blob
  }

  if (!result.uri) {
    throw new Error('Native recorder returned no recording')
  }

  const response = await fetch(getNativeRecordingUrl(result.uri))
  return response.blob()
}

/**
 * Discards an in-flight native recording during teardown or abandoned recording flows.
 */
export async function cancelNativeRecording(): Promise<void> {
  await CapacitorAudioRecorder.cancelRecording()
}
