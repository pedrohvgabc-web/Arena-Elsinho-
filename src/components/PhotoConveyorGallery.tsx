import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getPublicGalleryPhotos } from "@/lib/gallery.functions";
import "./PhotoConveyorGallery.css";

type GalleryPhoto = {
  id: string;
  title: string;
  altText: string;
  sortOrder: number;
  imageUrl: string;
};

type GalleryCardStyle = CSSProperties & {
  "--arena-gallery-x": string;
  "--arena-gallery-y": string;
  "--arena-gallery-depth": string;
  "--arena-gallery-scale": string;
  "--arena-gallery-opacity": string;
  "--arena-gallery-pitch": string;
  "--arena-gallery-yaw": string;
  zIndex: number;
};

function GalleryPhotoCard({
  photo,
  index,
  total,
  activeIndex,
  scrub = false,
}: {
  photo: GalleryPhoto;
  index: number;
  total: number;
  activeIndex: number;
  scrub?: boolean;
}) {
  const distance = index - activeIndex;
  const absoluteDistance = Math.abs(distance);
  const style: GalleryCardStyle | undefined = scrub
    ? {
        "--arena-gallery-x": `${Math.sin(distance * 0.55) * 18}vw`,
        "--arena-gallery-y": `${distance * 50}svh`,
        "--arena-gallery-depth": `${-absoluteDistance * 170}px`,
        "--arena-gallery-scale": `${Math.max(0.42, 1.28 - absoluteDistance * 0.28)}`,
        "--arena-gallery-opacity": `${Math.max(0, 1 - absoluteDistance * 0.29)}`,
        "--arena-gallery-pitch": `${Math.max(-82, Math.min(82, distance * -34))}deg`,
        "--arena-gallery-yaw": `${Math.sin(distance * 0.42) * 11}deg`,
        zIndex: Math.round(100 - absoluteDistance * 10),
      }
    : undefined;

  return (
    <article
      className={`arena-gallery__card${scrub && index === Math.round(activeIndex) ? " arena-gallery__card--active" : ""}`}
      style={style}
      aria-label={`${photo.title}, foto ${index + 1} de ${total}`}
    >
      <img
        className="arena-gallery__image"
        src={photo.imageUrl}
        alt={photo.altText}
        loading={index === 0 ? "eager" : "lazy"}
        decoding="async"
      />
      <div className="arena-gallery__caption">
        <span className="arena-gallery__count" aria-hidden="true">
          {String(index + 1).padStart(2, "0")} <span>/</span> {String(total).padStart(2, "0")}
        </span>
        <h3>{photo.title}</h3>
      </div>
    </article>
  );
}

export function PhotoConveyorGallery() {
  const fetchPhotos = useServerFn(getPublicGalleryPhotos);
  const query = useQuery({
    queryKey: ["public-gallery-photos"],
    queryFn: () => fetchPhotos(),
    staleTime: 60_000,
    retry: false,
  });
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<HTMLParagraphElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const photos = useMemo(
    () =>
      [...((query.data ?? []) as GalleryPhoto[])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 12),
    [query.data],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReducedMotion(media.matches);
    syncMotionPreference();
    media.addEventListener("change", syncMotionPreference);
    return () => media.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    if (photos.length < 4 || reducedMotion) {
      return;
    }

    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let inViewport = false;
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      if (!inViewport || document.hidden) return;
      const travel = Math.max(1, track.offsetHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / travel));
      const cursor = ratio * (photos.length - 1) - 0.24 * (1 - ratio);
      const focusedIndex = Math.min(
        photos.length - 1,
        Math.max(0, Math.round(ratio * (photos.length - 1))),
      );
      cardsRef.current
        ?.querySelectorAll<HTMLElement>(".arena-gallery__card")
        .forEach((card, index) => {
          const distance = index - cursor;
          const absoluteDistance = Math.abs(distance);
          card.style.setProperty("--arena-gallery-x", `${Math.sin(distance * 0.55) * 18}vw`);
          card.style.setProperty("--arena-gallery-y", `${distance * 50}svh`);
          card.style.setProperty("--arena-gallery-depth", `${-absoluteDistance * 170}px`);
          card.style.setProperty(
            "--arena-gallery-scale",
            `${Math.max(0.42, 1.28 - absoluteDistance * 0.28)}`,
          );
          card.style.setProperty(
            "--arena-gallery-opacity",
            `${Math.max(0, 1 - absoluteDistance * 0.29)}`,
          );
          card.style.setProperty(
            "--arena-gallery-pitch",
            `${Math.max(-82, Math.min(82, distance * -34))}deg`,
          );
          card.style.setProperty("--arena-gallery-yaw", `${Math.sin(distance * 0.42) * 11}deg`);
          card.style.zIndex = String(Math.round(100 - absoluteDistance * 10));
          card.classList.toggle("arena-gallery__card--active", index === focusedIndex);
        });
      if (positionRef.current) {
        const positionText = `${String(focusedIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
        if (positionRef.current.textContent !== positionText) {
          positionRef.current.textContent = positionText;
        }
      }
    };
    const scheduleUpdate = () => {
      if (!frame && inViewport && !document.hidden)
        frame = window.requestAnimationFrame(updateProgress);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = Boolean(entry?.isIntersecting);
        if (inViewport) scheduleUpdate();
        else if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { threshold: 0 },
    );
    const onVisibilityChange = () => {
      if (document.hidden && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else scheduleUpdate();
    };

    observer.observe(section);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [photos.length, reducedMotion]);

  return (
    <section className="arena-gallery" ref={sectionRef} aria-labelledby="arena-gallery-title">
      <div className="arena-gallery__intro">
        <div>
          <p className="arena-gallery__eyebrow">ARENA LESTE · PORTO VELHO</p>
          <h2 id="arena-gallery-title">A Arena em imagens</h2>
          <p className="arena-gallery__lead">Conheça os espaços da Arena Leste.</p>
        </div>
        <a className="arena-gallery__skip" href="#unidades">
          Pular galeria <span aria-hidden="true">/</span> Ir às unidades
        </a>
      </div>

      {query.isPending ? (
        <div
          className="arena-gallery__loading"
          aria-label="Carregando fotos da Arena"
          aria-busy="true"
        >
          <div className="arena-gallery__skeleton arena-gallery__skeleton--main" />
          <div className="arena-gallery__skeleton arena-gallery__skeleton--side" />
          <span className="arena-gallery__loading-label">Carregando a galeria…</span>
        </div>
      ) : query.isError && photos.length === 0 ? (
        <div className="arena-gallery__notice" role="status">
          <p>Não foi possível carregar as fotos agora. Tente novamente em instantes.</p>
          <button
            className="arena-gallery__retry"
            type="button"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : photos.length === 0 ? (
        <p className="arena-gallery__notice" role="status">
          A galeria da Arena está sendo preparada.
        </p>
      ) : photos.length < 4 || reducedMotion ? (
        <div className="arena-gallery__static-grid" aria-label="Fotos da Arena Leste">
          {photos.map((photo, index) => (
            <GalleryPhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              total={photos.length}
              activeIndex={0}
            />
          ))}
        </div>
      ) : (
        <div
          className="arena-gallery__track"
          ref={trackRef}
          style={{ height: `${Math.max(260, photos.length * 64)}svh` }}
        >
          <div className="arena-gallery__stage">
            <div
              className="arena-gallery__cards"
              ref={cardsRef}
              role="group"
              aria-label="Galeria de fotos da Arena Leste"
            >
              {photos.map((photo, index) => (
                <GalleryPhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  total={photos.length}
                  activeIndex={-0.24}
                  scrub
                />
              ))}
            </div>
            <a className="arena-gallery__stage-skip" href="#unidades">
              Pular galeria <span aria-hidden="true">/</span> Ir às unidades
            </a>
            <div className="arena-gallery__stage-footer">
              <p className="arena-gallery__hint">
                <span aria-hidden="true">↓</span> Role para percorrer as fotos
              </p>
              <p
                className="arena-gallery__position"
                ref={positionRef}
                aria-live="polite"
                aria-atomic="true"
              >
                01 / {String(photos.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>
      )}

      {query.isError && photos.length > 0 ? (
        <p className="arena-gallery__refresh-note" role="status">
          As fotos exibidas podem estar desatualizadas; não foi possível atualizar a galeria.
        </p>
      ) : null}
    </section>
  );
}
