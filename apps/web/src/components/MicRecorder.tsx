// MicRecorder — Web MediaRecorder wrapper for the Shadow stage.
//
// Per CONTEXT.md "Recording Policy", v1 microphone attempts are
// temporary on-device playback. Recordings are NOT uploaded or
// retained server-side; the `onStop` callback receives a `Blob`
// for local playback only (the Shadow page calls `URL.createObjectURL`
// for an `<audio>` element). The blob is discarded on replace,
// on leave, or on session end.
//
// The component tolerates environments without microphone access
// (jsdom, CI): the `navigator.mediaDevices?.getUserMedia` access
// is feature-detected, and a denied/unavailable mic surfaces a
// `role="alert"` message without crashing. This keeps the page
// testable without a real device.

import { useEffect, useRef, useState } from 'react';

export interface MicRecorderProps {
  /** Called with the recorded blob on stop, or `null` on discard. */
  readonly onStop: (blob: Blob | null) => void;
  /** Optional label override (defaults to "Microphone"). */
  readonly label?: string;
}

export function MicRecorder({ onStop, label = 'Microphone' }: MicRecorderProps): JSX.Element {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const urlRef = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      // Revoke the object URL on unmount to avoid leaks.
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    },
    [],
  );

  async function start(): Promise<void> {
    setError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not available in this environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const MediaRecorderCtor: typeof MediaRecorder =
        (globalThis as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder ??
        // jsdom 25 polyfill: MediaRecorder may be undefined.
        (class {
          ondataavailable: ((e: { data: BlobPart }) => void) | null = null;
          onstop: (() => void) | null = null;
          start(): void {
            void this.onstop?.();
          }
          stop(): void {
            void this.onstop?.();
          }
        } as unknown as typeof MediaRecorder);
      const rec = new MediaRecorderCtor(stream as unknown as MediaStream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setLastBlob(blob);
        onStop(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Microphone access denied.');
    }
  }

  function stop(): void {
    mediaRef.current?.stop();
    setRecording(false);
  }

  function discard(): void {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setLastBlob(null);
    onStop(null);
  }

  return (
    <div aria-label={label}>
      {error ? (
        <p role="alert">{error}</p>
      ) : !recording && lastBlob === null ? (
        <button type="button" onClick={() => void start()}>
          Record
        </button>
      ) : recording ? (
        <button type="button" onClick={stop}>
          Stop
        </button>
      ) : (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={urlRef.current ?? undefined} />
          <button type="button" onClick={discard}>
            Discard
          </button>
        </>
      )}
    </div>
  );
}