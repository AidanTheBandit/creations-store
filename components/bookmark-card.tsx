"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star, Archive, ExternalLink, AppWindow } from "lucide-react";
import { Button } from "./ui/button";

interface BookmarkCardProps {
  bookmark: {
    id: number;
    url: string;
    title: string;
    description?: string | null;
    category?: {
      id: string;
      name: string;
      color?: string;
      icon?: string;
    };
    user?: {
      id: string;
      name: string;
    } | null;
    favicon?: string | null;
    overview?: string | null;
    ogImage?: string | null;
    isArchived: boolean;
    isFavorite: boolean;
    slug: string;
  };
}

export const BookmarkCard = ({ bookmark }: BookmarkCardProps) => {
  const detailsUrl = `/${bookmark.slug}`;
  const externalUrl = bookmark.url;

  return (
    <div
      className={cn(
        "not-prose group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        bookmark.isArchived && "opacity-75 hover:opacity-100",
      )}
    >
      {/* App Icon Header */}
      <div className="relative bg-gradient-to-br from-muted/50 to-muted p-6 pb-4">
        <div className="flex items-start justify-between">
          {/* App Icon */}
          <Link
            href={detailsUrl}
            className="flex items-center justify-center rounded-2xl border-2 border-border bg-background p-3 shadow-sm transition-all hover:scale-105 hover:border-primary/50"
            aria-label={`View details for ${bookmark.title}`}
          >
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt={`${bookmark.title} icon`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl"
              />
            ) : bookmark.ogImage ? (
              <img
                src={bookmark.ogImage}
                alt={`${bookmark.title} preview`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <AppWindow
                className="h-16 w-16 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </Link>

          {/* Status Badges */}
          <div className="flex gap-1.5">
            {bookmark.isFavorite && (
              <Badge
                variant="secondary"
                className="bg-yellow-500/10 text-yellow-500 backdrop-blur-sm"
              >
                <Star className="h-3 w-3" aria-label="Featured" />
              </Badge>
            )}
            {bookmark.isArchived && (
              <Badge
                variant="secondary"
                className="bg-gray-500/10 text-gray-500 backdrop-blur-sm"
              >
                <Archive className="h-3 w-3" aria-label="Archived" />
              </Badge>
            )}
          </div>
        </div>

        {/* Category Badge */}
        {bookmark.category && (
          <div className="mt-3">
            <Badge
              variant="outline"
              className="border-0 bg-background/50 backdrop-blur-sm text-xs font-medium"
            >
              {bookmark.category.name}
            </Badge>
          </div>
        )}
      </div>

      {/* App Info Section */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
        {/* Title and Description */}
        <div className="space-y-1">
          <h2 className="font-semibold text-lg leading-tight tracking-tight group-hover:text-primary transition-colors">
            {bookmark.title}
          </h2>
          {bookmark.user && (
            <Link
              href={`/u/${bookmark.user.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              by {bookmark.user.name}
            </Link>
          )}
        </div>

        {/* Description */}
        {bookmark.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {bookmark.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 font-medium"
            asChild
          >
            <Link href={detailsUrl}>View</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="group/link flex-1 font-medium"
            asChild
          >
            <Link
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5"
            >
              Visit
              <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
