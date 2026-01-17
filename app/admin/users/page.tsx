"use client";

import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/admin-header";

interface User {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  creationCount: number;
  createdAt: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
      setError(null);
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    if (!searchValue.trim()) {
      setFilteredUsers(users);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    const filtered = users.filter((user) => {
      return (
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredUsers(filtered);
  };

  // Toggle suspension
  const handleToggleSuspension = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "unsuspend" : "suspend";
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ suspend: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      // Refresh the users list
      fetchUsers();
    } catch (err) {
      console.error(`Error ${action} user:`, err);
      alert(`Failed to ${action} user. Please try again.`);
    }
  };

  useEffect(() => {
    fetchUsers();
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <p className="mt-2 text-sm text-gray-500">
            Suspend users who violate the Terms of Service
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
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
            Found {filteredUsers.length} user
            {filteredUsers.length !== 1 ? "s" : ""}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </div>

        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md ${
                user.isSuspended ? "bg-red-50 border-red-200" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{user.name}</h2>
                    {user.isAdmin && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        Admin
                      </span>
                    )}
                    {user.isSuspended && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  {user.username && (
                    <p className="mt-1 text-sm text-gray-500">@{user.username}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>{user.creationCount} creations</span>
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handleToggleSuspension(user.id, user.isSuspended)}
                    className={`rounded-md px-3 py-1 text-white transition-colors ${
                      user.isSuspended
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {user.isSuspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              {searchTerm
                ? `No users found matching "${searchTerm}"`
                : "No users found."}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
