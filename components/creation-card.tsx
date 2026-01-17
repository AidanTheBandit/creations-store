"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star, Archive, ExternalLink, AppWindow } from "lucide-react";
import { Button } from "./ui/button";

interface CreationCardProps {
  creation: {
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
    iconUrl?: string | null;
    favicon?: string | null;
    overview?: string | null;
    ogImage?: string | null;
    themeColor?: string | null;
    author?: string | null;
    screenshotUrl?: string | null;
    isArchived: boolean;
    isFavorite: boolean;
    slug: string;
  };
}

// Legacy alias for backward compatibility
export interface BookmarkCardProps extends CreationCardProps {
  bookmark: CreationCardProps["creation"];
}

export const CreationCard = ({ creation }: CreationCardProps) => {
  const detailsUrl = `/${creation.slug}`;
  const externalUrl = creation.url;

  // Use iconUrl first, then fallback to favicon, then ogImage
  const iconSrc = creation.iconUrl || creation.favicon || creation.ogImage;

  return (
    <div
      className={cn(
        "not-prose group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        creation.isArchived && "opacity-75 hover:opacity-100",
      )}
      style={creation.themeColor ? {
        borderColor: `${creation.themeColor}33`,
      } : undefined}
    >
      {/* App Icon Header */}
      <div
        className="relative bg-gradient-to-br from-muted/50 to-muted p-6 pb-4"
        style={creation.themeColor ? {
          background: `linear-gradient(to bottom right, ${creation.themeColor}15, transparent)`,
        } : undefined}
      >
        <div className="flex items-start justify-between">
          {/* App Icon */}
          <Link
            href={detailsUrl}
            className="flex items-center justify-center rounded-2xl border-2 border-border bg-background p-3 shadow-sm transition-all hover:scale-105 hover:border-primary/50"
            style={creation.themeColor ? {
              borderColor: `${creation.themeColor}44`,
            } : undefined}
            aria-label={`View details for ${creation.title}`}
          >
            {iconSrc ? (
              <img
                src={iconSrc}
                alt={`${creation.title} icon`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl"
              />
            ) : creation.ogImage ? (
              <img
                src={creation.ogImage}
                alt={`${creation.title} preview`}
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
            {creation.isFavorite && (
              <Badge
                variant="secondary"
                className="bg-yellow-500/10 text-yellow-500 backdrop-blur-sm"
              >
                <Star className="h-3 w-3" aria-label="Featured" />
              </Badge>
            )}
            {creation.isArchived && (
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
        {creation.category && (
          <div className="mt-3">
            <Badge
              variant="outline"
              className="border-0 bg-background/50 backdrop-blur-sm text-xs font-medium"
              style={creation.category.color ? {
                backgroundColor: `${creation.category.color}22`,
                color: creation.category.color,
              } : undefined}
            >
              {creation.category.name}
            </Badge>
          </div>
        )}
      </div>

      {/* App Info Section */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
        {/* Title and Description */}
        <div className="space-y-1">
          <h2 className="font-semibold text-lg leading-tight tracking-tight group-hover:text-primary transition-colors">
            {creation.title}
          </h2>
          {/* Author or User */}
          {(creation.author || creation.user) && (
            <span className="text-sm text-muted-foreground">
              {creation.author ? `by ${creation.author}` : null}
              {creation.author && creation.user ? " • " : null}
              {creation.user && (
                <Link
                  href={`/u/${creation.user.id}`}
                  className="hover:text-foreground transition-colors"
                >
                  added by {creation.user.name}
                </Link>
              )}
            </span>
          )}
        </div>

        {/* Description */}
        {creation.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {creation.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 font-medium"
            style={creation.themeColor ? {
              backgroundColor: creation.themeColor,
            } : undefined}
            asChild
          >
            <Link href={detailsUrl}>View</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="group/link flex-1 font-medium"
            style={creation.themeColor ? {
              borderColor: `${creation.themeColor}66`,
            } : undefined}
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

// Legacy component alias for backward compatibility
export const BookmarkCard = ({ bookmark }: BookmarkCardProps) => <CreationCard creation={bookmark} />;
