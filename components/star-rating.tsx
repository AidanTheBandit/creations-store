import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function StarRating({
  rating,
  count,
  size = "md",
  showCount = true,
  className,
}: StarRatingProps) {
  const sizeClass = sizeClasses[size];

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            className={cn(sizeClass, "fill-yellow-400 text-yellow-400")}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarHalf
            key={i}
            className={cn(sizeClass, "fill-yellow-400 text-yellow-400")}
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            className={cn(sizeClass, "text-gray-300 dark:text-gray-600")}
          />
        );
      }
    }
    return stars;
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">{renderStars()}</div>
      {showCount && count !== undefined && count > 0 && (
        <span className="text-sm text-muted-foreground ml-1">
          ({count})
        </span>
      )}
    </div>
  );
}
