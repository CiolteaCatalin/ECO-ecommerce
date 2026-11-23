import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F4F8FD] text-slate-400 border border-slate-200 ${className}`}
        aria-label={alt || 'Fără imagine'}
      >
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-[#F4F8FD] ${className}`}
    />
  );
}
