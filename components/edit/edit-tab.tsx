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
} from "@/lib/models";
import type { GalleryImage } from "@/hooks/useGallery";

const MAX_IMAGES = 3;

interface EditTabProps {
  galleryImages: GalleryImage[];
  generationsLeft: number;
  addImage: (image: Omit<GalleryImage, "id" | "timestamp">) => void;
  decrementCount: (amount?: number) => void;
  pendingImage: GalleryImage | null;
  onConsumePending: () => void;
}

const EDIT_COST = 2;

interface SelectedImage {
  data: string;
  mediaType: string;
  source: "gallery" | "upload";
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
  const [lastPrompt, setLastPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    data: string;
    mediaType: string;
  } | null>(null);
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
      const exists = prev.some(
        (s) => s.data === pendingImage.data && s.source === "gallery"
      );
      if (exists) return prev;
      return [
        ...prev,
        {
          data: pendingImage.data,
          mediaType: pendingImage.mediaType,
          source: "gallery",
        },
      ];
    });
    onConsumePending();
  }, [pendingImage, onConsumePending]);

  const handleSelectGallery = (img: GalleryImage) => {
    const exists = selectedImages.find(
      (s) => s.data === img.data && s.source === "gallery"
    );
    if (exists) {
      setSelectedImages(
        selectedImages.filter(
          (s) => !(s.data === img.data && s.source === "gallery")
        )
      );
    } else if (selectedImages.length < MAX_IMAGES) {
      setSelectedImages([
        ...selectedImages,
        { data: img.data, mediaType: img.mediaType, source: "gallery" },
      ]);
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
        const mediaType = file.type;
        setSelectedImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, { data: base64, mediaType, source: "upload" }];
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
            { data: base64, mediaType: file.type, source: "upload" },
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
    setLastPrompt(prompt);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images: selectedImages.map((img) => img.data),
          model: editModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler bei der Bearbeitung");
      }

      if (data.images && data.images.length > 0) {
        setResult({
          data: data.images[0].data,
          mediaType: data.images[0].mediaType,
        });
        decrementCount(EDIT_COST);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsEditing(false);
    }
  };

  // "In Galerie speichern" — sichert das Ergebnis und setzt den Tab zurück.
  const handleSaveResult = () => {
    if (!result) return;
    addImage({
      data: result.data,
      mediaType: result.mediaType,
      prompt: `[Bearbeitet] ${lastPrompt}`,
    });
    setResult(null);
    setPrompt("");
    setSelectedImages([]);
    setLastPrompt("");
  };

  // "Weiterbearbeiten" — sichert automatisch in die Galerie, macht das Ergebnis
  // zum neuen einzigen Referenzbild und leert Prompt + alte Referenzen.
  const handleContinueEdit = () => {
    if (!result) return;
    addImage({
      data: result.data,
      mediaType: result.mediaType,
      prompt: `[Bearbeitet] ${lastPrompt}`,
    });
    setSelectedImages([
      { data: result.data, mediaType: result.mediaType, source: "upload" },
    ]);
    setResult(null);
    setPrompt("");
    setLastPrompt("");
  };

  const openFilePicker = () => fileInputRef.current?.click();

  if (!isLoaded) return null;

  const hasRefs = selectedImages.length > 0;
  const primaryRef = selectedImages[0];

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
                src={`data:${result.mediaType};base64,${result.data}`}
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
                  {selectedImages.map((img, i) => (
                    <ImageLightbox
                      key={i}
                      src={`data:${img.mediaType};base64,${img.data}`}
                      alt={`Ausgangsbild ${i + 1}`}
                      triggerClassName="h-16 w-16 rounded-md overflow-hidden border border-border bg-muted/30"
                    >
                      <img
                        src={`data:${img.mediaType};base64,${img.data}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </ImageLightbox>
                  ))}
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
                In Galerie speichern
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
            src={`data:${primaryRef.mediaType};base64,${primaryRef.data}`}
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
          <label
            className="flex flex-col items-center justify-center w-full max-w-2xl aspect-[4/3] border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
          >
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
      {!result && !isEditing && galleryImages.length > 0 && (
        <div className="shrink-0 px-4 md:px-8 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground mb-2">
              Aus Galerie wählen
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {galleryImages.map((img) => {
                const isSelected = selectedImages.some(
                  (s) => s.data === img.data && s.source === "gallery"
                );
                return (
                  <button
                    key={img.id}
                    onClick={() => handleSelectGallery(img)}
                    disabled={!isSelected && selectedImages.length >= MAX_IMAGES}
                    className={`relative shrink-0 rounded-md overflow-hidden border-2 h-14 w-14 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img
                      src={`data:${img.mediaType};base64,${img.data}`}
                      alt={img.prompt}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar — ALWAYS visible: thumbnails + prompt */}
      <div className="shrink-0 border-t border-border/50 bg-card/50 px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Row 1: Selected thumbnails + Add button */}
          <div className="flex items-center gap-2 flex-wrap min-h-[68px]">
            {selectedImages.map((img, i) => (
              <div
                key={i}
                className="relative h-16 w-16 rounded-md overflow-hidden border border-border"
              >
                <img
                  src={`data:${img.mediaType};base64,${img.data}`}
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
                className="h-16 w-16 rounded-md border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Bild hinzufügen"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
            {selectedImages.length === 0 && (
              <p className="text-xs text-muted-foreground italic ml-2">
                Wähle bis zu {MAX_IMAGES} Referenzbilder
              </p>
            )}
            {selectedImages.length > 0 && (
              <p className="text-xs text-muted-foreground ml-auto">
                {selectedImages.length}/{MAX_IMAGES}
              </p>
            )}
          </div>

          {/* Row 2: Textarea + Settings + Edit button */}
          <div className="flex items-end gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Was soll geändert werden?"
              className="min-h-[96px] max-h-[240px] resize-none flex-1 thin-scrollbar"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
              }}
            />
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
                generationsLeft < EDIT_COST
              }
              className="h-[52px] px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shrink-0"
              title={`Kostet ${EDIT_COST} Credits`}
            >
              {isEditing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Bearbeiten
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
