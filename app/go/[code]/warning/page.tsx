import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { creations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AlertTriangle, Home, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WarningPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export default async function WarningPage({
  params,
  searchParams,
}: WarningPageProps) {
  const { code } = await params;
  const { reason } = await searchParams;

  // Find creation by proxy code
  const result = await db
    .select()
    .from(creations)
    .where(eq(creations.proxyCode, code))
    .limit(1);

  if (result.length === 0) {
    redirect("/?error=invalid-link");
  }

  const creation = result[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-orange-200 dark:border-orange-900">
          {/* Warning Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Proceed with Caution
          </h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            This creation has been flagged for review
          </p>

          {/* Creation Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {creation.title}
            </p>
            {reason && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Reason: {reason}
              </p>
            )}
          </div>

          {/* Warning Message */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This link has been flagged by our moderation team. You can still
              proceed, but we recommend exercising caution. The destination may
              contain content that violates our community guidelines.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => redirect("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={() => window.open(creation.url, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Proceed Anyway
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-6">
            By proceeding, you acknowledge that you understand the risks.
          </p>
        </div>
      </div>
    </div>
  );
}
