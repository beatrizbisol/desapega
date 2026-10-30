"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoCarousel({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const total = photos.length;
  const current = photos[index] ?? null;

  function prev() {
    setIndex((value) => (value - 1 + total) % total);
  }

  function next() {
    setIndex((value) => (value + 1) % total);
  }

  if (!current) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-[var(--mist)] text-[var(--ink-soft)]">
        Sem fotos
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--mist)] sm:aspect-[5/6]">
        <Image
          key={current}
          src={current}
          alt={`${title} — foto ${index + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover animate-in fade-in duration-300"
        />
        {total > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm"
              aria-label="Foto anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm"
              aria-label="Próxima foto"
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo}
              type="button"
              onClick={() => setIndex(photoIndex)}
              className={`relative h-16 w-14 shrink-0 overflow-hidden border-2 transition ${
                photoIndex === index
                  ? "border-[var(--ocean)]"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Ver foto ${photoIndex + 1}`}
            >
              <Image src={photo} alt="" fill className="object-cover" sizes="56px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
