// Audio recorder — interface (port) and no-op stub.
//
// Phase A ships only the no-op stub. Phase C swaps in either:
//   * MediaRecorder + AudioWorklet (web), or
//   * Capacitor 8 microphone API + @aparajita/capacitor-secure-storage
//     for transport (Android, per ADR-0002).
//
// The stub returns empty Float32Array buffers with a deterministic
// sample-rate so the upstream contract is testable today. Real
// adapters must satisfy the same interface.

export interface AudioRecorder {
  readonly providerId: 'stub:no-op' | 'web:mediarecorder' | 'android:capacitor';
  /** Sample rate in Hz (e.g. 16000 for ASR, 44100 for full-fidelity). */
  sampleRate(): number;
  /** Begin capture; returns a stop handle. */
  start(): Promise<AudioRecorderHandle>;
}

export interface AudioRecorderHandle {
  /** Stop capture and return the captured PCM samples (Float32, mono). */
  stop(): Promise<AudioRecorderResult>;
  /** Cancel capture without returning samples. */
  cancel(): Promise<void>;
}

export interface AudioRecorderResult {
  readonly pcm: Float32Array;
  readonly sampleRate: number;
  /** Capture duration in seconds. */
  readonly durationSeconds: number;
}

export class NoOpAudioRecorder implements AudioRecorder {
  readonly providerId = 'stub:no-op' as const;

  sampleRate(): number {
    return 16000;
  }

  async start(): Promise<AudioRecorderHandle> {
    return {
      async stop(): Promise<AudioRecorderResult> {
        return { pcm: new Float32Array(0), sampleRate: this.sampleRate(), durationSeconds: 0 };
      },
      async cancel(): Promise<void> {
        /* no-op */
      },
    };
  }
}

export const defaultAudioRecorder: AudioRecorder = new NoOpAudioRecorder();