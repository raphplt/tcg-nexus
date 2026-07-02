"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  label,
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const uploadedUrl = await onUpload(file);
      onChange(uploadedUrl);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      
      {value ? (
        <div className="relative flex items-center justify-center rounded-lg border bg-muted/30 p-4 h-48 overflow-hidden group">
          {/* Preview Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label || "Uploaded image"}
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Overlays / Action button */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              disabled={disabled || isUploading}
              onClick={removeImage}
              title="Supprimer l'image"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || isUploading}
              onClick={onButtonClick}
            >
              Remplacer
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 h-48 cursor-pointer transition-colors duration-200 ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/10"
          } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Téléversement en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="rounded-full bg-muted p-3">
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Glissez-déposez une image ou cliquez pour parcourir
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou WEBP (Max. 2 Mo)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
