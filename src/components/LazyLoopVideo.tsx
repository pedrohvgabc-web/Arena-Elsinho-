import { useEffect, useRef } from "react";

type LazyLoopVideoProps = {
  src: string;
  poster: string;
  className?: string;
};

type SaveDataConnection = EventTarget & { saveData?: boolean };

/** Decorative loop: poster first, video only when visible and motion is allowed. */
export function LazyLoopVideo({ src, poster, className }: LazyLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: SaveDataConnection }).connection;
    let visible = false;

    const syncPlayback = () => {
      if (!visible || reducedMotion.matches || connection?.saveData) {
        video.pause();
        return;
      }
      if (!video.getAttribute("src")) {
        video.src = src;
        video.load();
      }
      void video.play().catch(() => undefined);
    };

    const onMotionChange = () => syncPlayback();
    const onConnectionChange = () => syncPlayback();
    reducedMotion.addEventListener("change", onMotionChange);
    connection?.addEventListener("change", onConnectionChange);

    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          syncPlayback();
        },
        { rootMargin: "120px 0px", threshold: 0.01 },
      );
      observer.observe(video);
    } else {
      visible = true;
      syncPlayback();
    }

    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      connection?.removeEventListener("change", onConnectionChange);
      video.pause();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    />
  );
}
