"use client";

import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/admin-header";
import Link from "next/link";

interface Creation {
  url: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  use_case: string | null;
  how_to_use: string | null;
  overview: string | null;
  screenshot_url: string | null;
}

export default function ManageCreations() {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [filteredCreations, setFilteredCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch creations
  const fetchCreations = async () => {
    try {
      const response = await fetch("/api/creations");
      if (!response.ok) {
        throw new Error("Failed to fetch creations");
      }
      const data = await response.json();
      setCreations(data);
      setFilteredCreations(data);
      setError(null);
    } catch (err) {
      setError("Failed to load creations");
      console.error("Error fetching creations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    if (!searchValue.trim()) {
      setFilteredCreations(creations);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    const filtered = creations.filter((creation) => {
      return (
        creation.name.toLowerCase().includes(searchLower) ||
        creation.url.toLowerCase().includes(searchLower) ||
        creation.description?.toLowerCase().includes(searchLower) ||
        creation.category?.toLowerCase().includes(searchLower) ||
        creation.use_case?.toLowerCase().includes(searchLower) ||
        creation.overview?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredCreations(filtered);
  };

  // Delete creation
  const handleDelete = async (url: string) => {
    if (!confirm("Are you sure you want to delete this creation?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/creations/${encodeURIComponent(url)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete creation");
      }

      // Refresh the creations list
      fetchCreations();
    } catch (err) {
      console.error("Error deleting creation:", err);
      alert("Failed to delete creation. Please try again.");
    }
  };

  useEffect(() => {
    fetchCreations();
  }, []);

  if (loading) {
    return (
      <>
        <AdminHeader />
        <div className="mx-auto max-w-7xl p-6">
          <div className="text-center">Loading...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminHeader />
        <div className="mx-auto max-w-7xl p-6">
          <div className="text-center text-red-500">{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Creations</h1>
          <Link
            href="/admin"
            className="rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Add New Creation
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search creations..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border p-3 pl-10 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Found {filteredCreations.length} creation
            {filteredCreations.length !== 1 ? "s" : ""}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </div>

        <div className="grid gap-4">
          {filteredCreations.map((creation) => (
            <div
              key={creation.url}
              className="rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{creation.name}</h2>
                  <a
                    href={creation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-blue-500 hover:underline"
                  >
                    {creation.url}
                  </a>
                  {creation.description && (
                    <p className="mt-2 text-gray-600">{creation.description}</p>
                  )}
                  {creation.category && (
                    <p className="mt-1 text-sm text-gray-500">
                      Category: {creation.category}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(creation.url)}
                  className="ml-4 text-red-500 transition-colors hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {filteredCreations.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              {searchTerm
                ? `No creations found matching "${searchTerm}"`
                : "No creations found. Add some creations to get started!"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
