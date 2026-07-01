"use client";

import { Eye, Lock } from "lucide-react";
import { useState } from "react";

const mediaSources = {
  impact: "/images/real/impact-preview.jpg",
  gymWhiteShorts: "/images/real/gym-mirror-white-shorts.jpg",
  gymMirrorGrey: "/images/real/gym-mirror-grey.png",
  bathroomBlack: "/images/real/bathroom-black.jpg",
  bedClose: "/images/real/bed-close.png",
  gymWhite: "/images/real/gym-white.png",
  lockerBlack: "/images/real/locker-black.png",
  bathroomGreen: "/images/real/bathroom-green.png"
};

export default function SensitiveImage({
  mediaId,
  alt,
  title,
  className = "",
  style,
  wrapperClassName = "",
  compact = false,
  revealHref = ""
}) {
  const [revealed, setRevealed] = useState(false);
  const src = mediaSources[mediaId];

  if (!src) {
    return null;
  }

  return (
    <div className={`sensitive-media ${revealed ? "sensitive-media-revealed" : ""} ${wrapperClassName}`}>
      {revealed ? (
        <img
          src={src}
          alt={alt}
          className={className}
          style={style}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : revealHref ? (
        <a
          href={revealHref}
          className={`sensitive-cover ${compact ? "sensitive-cover-compact" : ""}`}
          aria-label={`Ver ${title}`}
        >
          <span className="sensitive-lock">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="sensitive-cover-title">{title}</span>
          <span className="sensitive-cover-action">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Toque para ver
          </span>
        </a>
      ) : (
        <button
          type="button"
          className={`sensitive-cover ${compact ? "sensitive-cover-compact" : ""}`}
          onClick={() => setRevealed(true)}
          aria-label={`Ver ${title}`}
        >
          <span className="sensitive-lock">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="sensitive-cover-title">{title}</span>
          <span className="sensitive-cover-action">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Toque para ver
          </span>
        </button>
      )}
    </div>
  );
}
