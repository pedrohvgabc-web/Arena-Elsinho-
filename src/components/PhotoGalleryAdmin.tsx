import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteGalleryPhoto,
  adminGalleryPhotos,
  adminMoveGalleryPhoto,
  adminUpdateGalleryPhoto,
  adminUploadGalleryPhoto,
  type PhotoGalleryAdminItem,
} from "@/lib/gallery.functions";

const MAX_PHOTO_BYTES = 600 * 1024;
const MAX_ORIGINAL_BYTES = 16 * 1024 * 1024;
const MAX_LIBRARY_SIZE = 50;
const MAX_PUBLISHED = 12;

function blobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível preparar a foto."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível preparar a foto."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

async function optimizePhoto(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error("A foto original deve ter até 16 MB.");

  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 1600;
    const baseScale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    const qualities = [0.82, 0.75, 0.68, 0.62];
    const scales = [1, 0.9, 0.8, 0.7];

    for (const additionalScale of scales) {
      canvas.width = Math.max(1, Math.round(bitmap.width * baseScale * additionalScale));
      canvas.height = Math.max(1, Math.round(bitmap.height * baseScale * additionalScale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Este navegador não conseguiu otimizar a foto.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of qualities) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (blob && blob.size <= MAX_PHOTO_BYTES) return blobAsDataUrl(blob);
      }
    }
    throw new Error("Não foi possível deixar esta imagem leve o suficiente. Tente outra foto.");
  } finally {
    bitmap.close();
  }
}

function PhotoEditor({
  photo,
  index,
  count,
  saving,
  moving,
  deleting,
  onSave,
  onMove,
  onDelete,
}: {
  photo: PhotoGalleryAdminItem;
  index: number;
  count: number;
  saving: boolean;
  moving: boolean;
  deleting: boolean;
  onSave: (data: { id: string; title: string; altText: string; isActive: boolean }) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onDelete: (photo: PhotoGalleryAdminItem) => void;
}) {
  const [title, setTitle] = useState(photo.title);
  const [altText, setAltText] = useState(photo.altText);
  const [isActive, setIsActive] = useState(photo.isActive);

  useEffect(() => {
    setTitle(photo.title);
    setAltText(photo.altText);
    setIsActive(photo.isActive);
  }, [photo.title, photo.altText, photo.isActive]);

  const dirty =
    title.trim() !== photo.title || altText.trim() !== photo.altText || isActive !== photo.isActive;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={photo.imageUrl}
          alt={photo.altText}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${
            photo.isActive ? "bg-primary text-primary-foreground" : "bg-black/75 text-white"
          }`}
        >
          {photo.isActive ? "Publicada" : "Oculta"}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <label className="block text-sm font-semibold" htmlFor={`photo-title-${photo.id}`}>
          Título
        </label>
        <input
          id={`photo-title-${photo.id}`}
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <label className="block text-sm font-semibold" htmlFor={`photo-alt-${photo.id}`}>
          Descrição da imagem
        </label>
        <textarea
          id={`photo-alt-${photo.id}`}
          value={altText}
          maxLength={180}
          rows={2}
          onChange={(event) => setAltText(event.target.value)}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
          aria-describedby={`photo-alt-help-${photo.id}`}
        />
        <p
          id={`photo-alt-help-${photo.id}`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          Texto lido por leitores de tela. Descreva o que aparece na foto.
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            aria-label={`Publicar ${title || photo.title} na galeria`}
          />
          <span className="flex items-center gap-2 font-semibold">
            {isActive ? (
              <Eye size={16} aria-hidden="true" />
            ) : (
              <EyeOff size={16} aria-hidden="true" />
            )}
            Mostrar no site
          </span>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex gap-2" aria-label={`Ordem da foto ${index + 1} de ${count}`}>
            <button
              type="button"
              className="btn min-h-11 min-w-11 px-3"
              aria-label="Mover foto para cima"
              disabled={index === 0 || moving}
              onClick={() => onMove(photo.id, "up")}
            >
              {moving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp size={17} />}
            </button>
            <button
              type="button"
              className="btn min-h-11 min-w-11 px-3"
              aria-label="Mover foto para baixo"
              disabled={index === count - 1 || moving}
              onClick={() => onMove(photo.id, "down")}
            >
              {moving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDown size={17} />}
            </button>
          </div>
          <button
            type="button"
            className="btn min-h-11 border-destructive/40 px-3 text-destructive hover:bg-destructive/10"
            disabled={deleting}
            onClick={() => onDelete(photo)}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
            Excluir
          </button>
          <button
            type="button"
            className="btn pri min-h-11 px-3"
            disabled={!dirty || saving || !title.trim() || !altText.trim()}
            onClick={() => onSave({ id: photo.id, title, altText, isActive })}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
        </div>
      </div>
    </article>
  );
}

export function PhotoGalleryAdmin() {
  const queryClient = useQueryClient();
  const fetchPhotos = useServerFn(adminGalleryPhotos);
  const uploadPhoto = useServerFn(adminUploadGalleryPhoto);
  const savePhoto = useServerFn(adminUpdateGalleryPhoto);
  const movePhoto = useServerFn(adminMoveGalleryPhoto);
  const deletePhoto = useServerFn(adminDeleteGalleryPhoto);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-gallery-photos"],
    queryFn: () => fetchPhotos(),
    retry: false,
  });
  const photos = query.data ?? [];
  const publishedCount = photos.filter((photo) => photo.isActive).length;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin-gallery-photos"] });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Escolha uma foto para enviar.");
      return;
    }
    setUploading(true);
    try {
      const imageDataUrl = await optimizePhoto(file);
      const result = await uploadPhoto({ data: { title, altText, imageDataUrl } });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível enviar a foto.");
        return;
      }
      toast.success(result.isActive ? "Foto publicada na galeria." : "Foto salva como oculta.");
      setTitle("");
      setAltText("");
      setFile(null);
      const input = document.getElementById("gallery-photo-file");
      if (input instanceof HTMLInputElement) input.value = "";
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(data: {
    id: string;
    title: string;
    altText: string;
    isActive: boolean;
  }) {
    setSavingId(data.id);
    try {
      const result = await savePhoto({ data });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar esta foto.");
        return;
      }
      toast.success("Foto atualizada.");
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["public-gallery-photos"] });
    } catch {
      toast.error("Não foi possível salvar esta foto. Confira sua conexão e tente novamente.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    setMovingId(id);
    try {
      const result = await movePhoto({ data: { id, direction } });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mudar a ordem.");
        return;
      }
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["public-gallery-photos"] });
    } catch {
      toast.error("Não foi possível mudar a ordem das fotos.");
    } finally {
      setMovingId(null);
    }
  }

  async function handleDelete(photo: PhotoGalleryAdminItem) {
    if (!window.confirm(`Excluir “${photo.title}” da biblioteca? Esta ação não pode ser desfeita.`))
      return;
    setDeletingId(photo.id);
    try {
      const result = await deletePhoto({ data: { id: photo.id } });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível excluir esta foto.");
        return;
      }
      toast.success("Foto excluída.");
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["public-gallery-photos"] });
    } catch {
      toast.error("Não foi possível excluir esta foto. Confira sua conexão e tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-7" aria-labelledby="gallery-admin-title">
      <header>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Imagens da Arena
        </p>
        <h1
          id="gallery-admin-title"
          className="mt-2 font-display text-4xl font-extrabold uppercase"
        >
          Galeria de fotos
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Envie fotos da Arena, organize a ordem e escolha quais aparecem no carrossel 3D da página
          inicial. A esteira é ativada quando há pelo menos quatro fotos publicadas.
        </p>
      </header>

      <aside className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
        <strong className="text-primary">Para manter o site rápido:</strong> as fotos são otimizadas
        para WebP automaticamente. Cada arquivo final fica limitado a 600 KB; você pode guardar até{" "}
        {MAX_LIBRARY_SIZE} imagens e publicar até {MAX_PUBLISHED} no carrossel ao mesmo tempo.
      </aside>

      {query.isError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Não foi possível carregar a biblioteca. Atualize a tela e confira se a galeria já foi
          configurada no banco de dados.
        </p>
      )}

      <form
        onSubmit={handleUpload}
        className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl font-bold uppercase">Adicionar uma foto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No celular, você pode tirar uma nova foto ou selecionar uma imagem da galeria do
            aparelho.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="gallery-photo-title" className="text-sm font-semibold">
            Título curto
          </label>
          <input
            id="gallery-photo-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Ex.: Quadras ao pôr do sol"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="gallery-photo-alt" className="text-sm font-semibold">
            O que aparece na foto?
          </label>
          <input
            id="gallery-photo-alt"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            maxLength={180}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Ex.: Jogadores disputam uma bola na quadra de areia"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Essa descrição também ajuda quem usa leitor de tela.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="gallery-photo-file" className="text-sm font-semibold">
            Tirar ou selecionar uma foto
          </label>
          <input
            id="gallery-photo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-11 w-full rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-primary file:px-3 file:font-semibold file:text-primary-foreground"
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WebP; até 16 MB antes da otimização.
          </p>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={
              uploading ||
              !file ||
              !title.trim() ||
              !altText.trim() ||
              photos.length >= MAX_LIBRARY_SIZE
            }
            className="btn pri min-h-12 w-full justify-center sm:w-auto"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus size={17} />}
            {uploading ? "Otimizando e enviando…" : "Adicionar à biblioteca"}
          </button>
          {photos.length >= MAX_LIBRARY_SIZE && (
            <p className="mt-2 text-sm text-destructive" role="status">
              A biblioteca chegou ao limite. Exclua uma foto para adicionar outra.
            </p>
          )}
        </div>
      </form>

      <section aria-labelledby="gallery-library-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="gallery-library-title" className="font-display text-2xl font-bold uppercase">
              Biblioteca
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {photos.length} de {MAX_LIBRARY_SIZE} fotos · {publishedCount} de {MAX_PUBLISHED}{" "}
              publicadas
            </p>
          </div>
          {query.isFetching && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Atualizando fotos" />
          )}
        </div>
        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando fotos">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : photos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo, index) => (
              <PhotoEditor
                key={photo.id}
                photo={photo}
                index={index}
                count={photos.length}
                saving={savingId === photo.id}
                moving={movingId === photo.id}
                deleting={deletingId === photo.id}
                onSave={handleSave}
                onMove={handleMove}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : !query.isError ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <ImagePlus className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
            <p className="mt-3 font-display text-xl font-bold uppercase">
              A galeria ainda está vazia
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Adicione pelo menos quatro fotos reais da Arena para formar a esteira 3D na página
              inicial. As imagens ficam guardadas no sistema e você pode ocultá-las sem excluí-las.
            </p>
          </div>
        ) : null}
      </section>
    </section>
  );
}
