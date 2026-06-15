"use client";

import { FormEvent, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  login_count: number;
  last_seen_at: string | null;
  created_at: string;
};

type UsersPayload = {
  users: UserRow[];
  total: number;
  limit: number;
  offset: number;
};

const SECRET_KEY = "aletheia_analytics_admin_secret";
const PAGE_SIZE = 100;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InternalUsersPage() {
  const [secret, setSecret] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.sessionStorage.getItem(SECRET_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<UsersPayload | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  async function loadUsers(event?: FormEvent, overridePage?: number, overrideSearch?: string) {
    event?.preventDefault();
    const token = secret.trim();
    if (!token) {
      setError("Enter ANALYTICS_ADMIN_SECRET to load users.");
      return;
    }

    setLoading(true);
    setError(null);

    const currentPage = overridePage ?? page;
    const currentSearch = overrideSearch ?? search;

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentPage * PAGE_SIZE),
      });
      if (currentSearch) params.set("search", currentSearch);

      const response = await fetch(`/api/internal/users?${params.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Unauthorized. Check your analytics secret."
            : "Failed to load users."
        );
      }

      const data = (await response.json()) as UsersPayload;
      setPayload(data);
      setPage(currentPage);

      try {
        window.sessionStorage.setItem(SECRET_KEY, token);
      } catch {
        // Optional
      }
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    loadUsers(undefined, 0, search);
  }

  const totalPages = payload ? Math.ceil(payload.total / PAGE_SIZE) : 0;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">User Accounts</h1>
            <p className="text-sm text-slate-600">
              Registered accounts from the <span className="font-mono">users</span> table. Protected by{" "}
              <span className="font-mono">ANALYTICS_ADMIN_SECRET</span>.
            </p>
          </div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={loadUsers}>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ANALYTICS_ADMIN_SECRET"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load Users"}
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          {!error && !payload ? (
            <p className="mt-3 text-sm text-slate-600">
              Enter your admin secret and click Load Users to display accounts.
            </p>
          ) : null}
        </header>

        {payload ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{payload.total}</span> total accounts
                {payload.total > PAGE_SIZE
                  ? ` — showing ${payload.offset + 1}–${Math.min(payload.offset + payload.users.length, payload.total)}`
                  : null}
              </p>
              <form className="flex gap-2" onSubmit={handleSearch}>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email or name…"
                  className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-slate-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  Search
                </button>
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(0);
                      loadUsers(undefined, 0, "");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Clear
                  </button>
                ) : null}
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Logins</th>
                      <th className="px-4 py-3 font-medium">Last Seen</th>
                      <th className="px-4 py-3 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payload.users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      payload.users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-800">{user.email}</td>
                          <td className="px-4 py-3 text-slate-700">{user.name ?? <span className="text-slate-400">—</span>}</td>
                          <td className="px-4 py-3 text-slate-600">{user.login_count}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(user.last_seen_at)}</td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => loadUsers(undefined, page - 1)}
                  disabled={page === 0 || loading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => loadUsers(undefined, page + 1)}
                  disabled={page >= totalPages - 1 || loading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
