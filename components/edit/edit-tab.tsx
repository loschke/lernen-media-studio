"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Edit3,
  Loader2,
  Info,
  ImagePlus,
  X,
  Save,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FittedImage } from "@/components/ui/fitted-image";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { GenerateSettings } from "@/components/generate/generate-settings";
import { useGenerateSettings } from "@/hooks/useGenerateSettings";
import {
  ALLOWED_EDIT_MODEL_IDS,
  DEFAULT_EDIT_MODEL,
  EDIT_CAPABLE_MODELS,
  getModelCost,
} from "@/lib/models";
import type { GalleryImage } from "@/hooks/useGallery";

const MAX_IMAGES = 3;

interface EditTabProps {
  galleryImages: GalleryImage[];
  generationsLeft: number;
  addImage: (image: GalleryImage) => void;
  decrementCount: (amount?: number) => void;
  pendingImage: GalleryImage | null;
  onConsumePending: () => void;
}

/**
 * A reference image selected for editing — either a gallery item (server-side
 * R2 object, sent by id) or an upload (client-side base64, sent inline).
 */
type SelectedImage =
  | { source: "gallery"; id: string; url: string; mediaType: string }
  | { source: "upload"; data: string; mediaType: string };

function imageDisplaySrc(img: SelectedImage): string {
  if (img.source === "gallery") return img.url;
  return `data:${img.mediaType};base64,${img.data}`;
}

function isSameSelected(a: SelectedImage, b: SelectedImage): boolean {
  if (a.source !== b.source) return false;
  if (a.source === "gallery" && b.source === "gallery") return a.id === b.id;
  if (a.source === "upload" && b.source === "upload") return a.data === b.data;
  return false;
}

export function EditTab({
  galleryImages,
  generationsLeft,
  addImage,
  decrementCount,
  pendingImage,
  onConsumePending,
}: EditTabProps) {
  const { model, aspectRatio, setModel, setAspectRatio, isLoaded } =
    useGenerateSettings();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GalleryImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit unterstützt nur die 3.x Modelle. Wenn das gespeicherte Modell nicht
  // edit-fähig ist (z.B. 2.5-flash), automatisch auf 3.1-flash wechseln.
  useEffect(() => {
    if (!isLoaded) return;
    if (!ALLOWED_EDIT_MODEL_IDS.has(model)) {
      setModel(DEFAULT_EDIT_MODEL);
    }
  }, [isLoaded, model, setModel]);

  const editModel = ALLOWED_EDIT_MODEL_IDS.has(model)
    ? model
    : DEFAULT_EDIT_MODEL;

  // Handle incoming pending image from Gallery
  useEffect(() => {
    if (!pendingImage) return;
    setSelectedImages((prev) => {
      if (prev.length >= MAX_IMAGES) return prev;
      const next: SelectedImage = {
        source: "gallery",
        id: pendingImage.id,
        url: pendingImage.url,
        mediaType: pendingImage.mediaType,
      };
      if (prev.some((s) => isSameSelected(s, next))) return prev;
      return [...prev, next];
    });
    onConsumePending();
  }, [pendingImage, onConsumePending]);

  const handleSelectGallery = (img: GalleryImage) => {
    const candidate: SelectedImage = {
      source: "gallery",
      id: img.id,
      url: img.url,
      mediaType: img.mediaType,
    };
    const exists = selectedImages.some((s) => isSameSelected(s, candidate));
    if (exists) {
      setSelectedImages((prev) =>
        prev.filter((s) => !isSameSelected(s, candidate))
      );
    } else if (selectedImages.length < MAX_IMAGES) {
      setSelectedImages((prev) => [...prev, candidate]);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (selectedImages.length >= MAX_IMAGES) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        setSelectedImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [
            ...prev,
            { source: "upload", data: base64, mediaType: file.type },
          ];
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/") || selectedImages.length >= MAX_IMAGES)
        return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        setSelectedImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [
            ...prev,
            { source: "upload", data: base64, mediaType: file.type },
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSelected = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleEdit = async () => {
    if (!prompt.trim() || selectedImages.length === 0) return;
    setIsEditing(true);
    setError("");
    setResult(null);

    try {
      const imageRefs = selectedImages.map((img) =>
        img.source === "gallery"
          ? { source: "gallery", id: img.id }
          : { source: "upload", data: img.data, mediaType: img.mediaType }
      );

      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageRefs, model: editModel }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler bei der Bearbeitung");
      }

      if (data.images && data.images.length > 0) {
        const resultImage: GalleryImage = data.images[0];
        setResult(resultImage);
        // Image is already in R2; mirror in local gallery state.
        addImage(resultImage);
        decrementCount(getModelCost(editModel));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsEditing(false);
    }
  };

  // "In Galerie speichern" — Bild ist bereits in R2; nur State zurücksetzen.
  const handleSaveResult = () => {
    setResult(null);
    setPrompt("");
    setSelectedImages([]);
  };

  // "Weiterbearbeiten" — Ergebnis (bereits in R2) wird zur einzigen neuen
  // Referenz, Prompt + alte Refs werden geleert.
  const handleContinueEdit = () => {
    if (!result) return;
    setSelectedImages([
      {
        source: "gallery",
        id: result.id,
        url: result.url,
        mediaType: result.mediaType,
      },
    ]);
    setResult(null);
    setPrompt("");
  };

  const openFilePicker = () => fileInputRef.current?.click();

  if (!isLoaded) return null;

  const hasRefs = selectedImages.length > 0;
  const primaryRef = selectedImages[0];
  const editCost = getModelCost(editModel);

  return (
    <div className="flex flex-col h-full">
      {/* Canvas area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden p-6 min-h-0"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {result ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500 w-full h-full min-h-0">
            <div className="flex-1 min-h-0 w-full">
              <FittedImage
                src={result.url}
                alt="Bearbeitetes Bild"
                className="rounded-xl overflow-hidden border border-border bg-muted/30"
              />
            </div>

            {/* Before/After — sources used for this edit */}
            {selectedImages.length > 0 && (
              <div className="shrink-0 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="uppercase tracking-wider">
                  {selectedImages.length === 1
                    ? "Ausgangsbild"
                    : "Ausgangsbilder"}
                </span>
                <div className="flex gap-1.5">
                  {selectedImages.map((img, i) => {
                    const src = imageDisplaySrc(img);
                    return (
                      <ImageLightbox
                        key={i}
                        src={src}
                        alt={`Ausgangsbild ${i + 1}`}
                        triggerClassName="h-16 w-16 rounded-md overflow-hidden border border-border bg-muted/30"
                      >
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </ImageLightbox>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 shrink-0">
              <Button
                onClick={handleSaveResult}
                variant="secondary"
                className="shrink-0"
              >
                <Save className="h-4 w-4 mr-2" />
                Fertig
              </Button>
              <Button
                onClick={handleContinueEdit}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Weiterbearbeiten
              </Button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-serif italic text-base">
              Dein Bild wird bearbeitet...
            </p>
          </div>
        ) : hasRefs ? (
          /* Primary reference shown large when refs exist */
          <FittedImage
            src={imageDisplaySrc(primaryRef)}
            alt="Referenzbild"
            className="animate-in fade-in duration-300 rounded-xl overflow-hidden border border-border bg-muted/30"
          >
            {selectedImages.length > 1 && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                +{selectedImages.length - 1} weitere
              </div>
            )}
          </FittedImage>
        ) : (
          <label className="flex flex-col items-center justify-center w-full max-w-2xl aspect-[4/3] border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
            <div className="flex flex-col items-center gap-3 text-muted-foreground text-center px-6">
              <Upload className="h-12 w-12 opacity-40" />
              <p className="text-base font-medium text-foreground/70">
                Ziehe deine Bilder hierhin
              </p>
              <p className="text-sm">
                Oder klicke, um Bilder von deinem Gerät auszuwählen
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        )}
        {/* Hidden input shared by "+"-Button (outside the label) */}
        {hasRefs && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        )}
      </div>

      {error && (
        <div className="mx-4 md:mx-8 mb-3 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex items-start gap-3">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Gallery thumbnail strip — only when there are gallery images and no result */}
      {!result && !isEditing && galleryImages.some((g) => g.mediaType.startsWith("image/")) && (
        <div className="shrink-0 px-4 md:px-8 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground mb-2">
              Aus Bibliothek wählen
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {galleryImages
                .filter((g) => g.mediaType.startsWith("image/"))
                .map((img) => {
                const isSelected = selectedImages.some(
                  (s) => s.source === "gallery" && s.id === img.id
                );
                return (
                  <button
                    key={img.id}
                    onClick={() => handleSelectGallery(img)}
                    disabled={
                      !isSelected && selectedImages.length >= MAX_IMAGES
                    }
                    className={`relative shrink-0 rounded-md overflow-hidden border-2 h-14 w-14 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.prompt}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Prompt-Card — Refs row, textarea, action bar */}
      <div className="shrink-0 px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card overflow-hidden focus-within:border-primary/50 transition-colors">
          {/* Row 1: Reference thumbnails + Add button */}
          <div className="flex items-center gap-2 flex-wrap px-3 py-3 border-b border-border/40">
            {selectedImages.map((img, i) => (
              <div
                key={i}
                className="relative h-14 w-14 rounded-md overflow-hidden border border-border"
              >
                <img
                  src={imageDisplaySrc(img)}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeSelected(i)}
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                  title="Entfernen"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {selectedImages.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={openFilePicker}
                className="h-14 w-14 rounded-md border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Bild hinzufügen"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
            )}
            {selectedImages.length === 0 && (
              <p className="text-xs text-muted-foreground italic ml-1">
                Wähle bis zu {MAX_IMAGES} Referenzbilder
              </p>
            )}
            {selectedImages.length > 0 && (
              <p className="text-xs text-muted-foreground ml-auto">
                {selectedImages.length}/{MAX_IMAGES}
              </p>
            )}
          </div>

          {/* Row 2: Textarea — full width */}
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Was soll geändert werden?"
            className="min-h-[96px] max-h-[240px] resize-none thin-scrollbar border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleEdit();
              }
            }}
          />

          {/* Row 3: Action bar */}
          <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-border/40">
            <GenerateSettings
              model={editModel}
              aspectRatio={aspectRatio}
              onModelChange={setModel}
              onAspectRatioChange={setAspectRatio}
              availableModels={EDIT_CAPABLE_MODELS}
            />
            <Button
              onClick={handleEdit}
              disabled={
                !prompt.trim() ||
                selectedImages.length === 0 ||
                isEditing ||
                generationsLeft < editCost
              }
              size="sm"
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              title={`Kostet ${editCost} ${
                editCost === 1 ? "Credit" : "Credits"
              }`}
            >
              {isEditing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                  Bearbeiten
                  <span className="ml-1.5 text-[10px] opacity-70">
                    · {editCost}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
