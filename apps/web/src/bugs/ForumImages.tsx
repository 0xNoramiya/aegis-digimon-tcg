import type { FeedbackImage } from "@aegis/shared/feedback/forumTypes";
import { forumClient } from "@/bugs/forumClient";

export function ForumImages({ images }: { images: FeedbackImage[] }) {
  if (!images.length) return null;
  return (
    <div className="forum-images">
      {images.map((image) => (
        <a key={image.id} href={forumClient.imageUrl(image.id)} target="_blank" rel="noopener noreferrer">
          <img
            src={forumClient.imageUrl(image.id)}
            alt={image.name}
            width={image.width}
            height={image.height}
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
