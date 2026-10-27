"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
} from "date-fns";
import { karachiDayKey, formatKarachi } from "@/lib/time";
import type { PostWithDetails } from "@/lib/types";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView({ posts }: { posts: PostWithDetails[] }) {
  const [current, setCurrent] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [current]);

  const years = useMemo(() => {
    const thisYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => thisYear - 5 + i);
  }, []);

  const postsByDay = useMemo(() => {
    const map = new Map<string, PostWithDetails[]>();
    for (const p of posts) {
      const key = karachiDayKey(p.scheduled_for);
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const selectedPosts = selectedKey ? (postsByDay.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={current.getMonth()}
              onChange={(e) =>
                setCurrent((c) => new Date(c.getFullYear(), Number(e.target.value), 1))
              }
              className="input !w-auto !py-1.5 text-sm font-medium"
              aria-label="Month"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={current.getFullYear()}
              onChange={(e) =>
                setCurrent((c) => new Date(Number(e.target.value), c.getMonth(), 1))
              }
              className="input !w-auto !py-1.5 text-sm font-medium"
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCurrent((c) => addMonths(c, -1))}
              className="btn-secondary !px-2 !py-1"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrent(new Date())}
              className="btn-secondary !px-3 !py-1 text-xs"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrent((c) => addMonths(c, 1))}
              className="btn-secondary !px-2 !py-1"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-slate-200">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="bg-slate-50 py-2 text-center text-xs font-medium text-slate-500"
            >
              {d}
            </div>
          ))}
          {days.map((d) => {
            const key = dayKey(d);
            const dayPosts = postsByDay.get(key) ?? [];
            const inMonth = isSameMonth(d, current);
            const isSelected = key === selectedKey;
            return (
              <div
                key={key}
                onClick={() => setSelectedKey(key)}
                className={cn(
                  "group relative min-h-[96px] cursor-pointer bg-white p-1.5 transition hover:bg-brand-50/40",
                  !inMonth && "bg-slate-50/60",
                  isSelected && "ring-2 ring-inset ring-brand-400",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday(d)
                        ? "bg-brand-600 text-white"
                        : inMonth
                          ? "text-slate-700"
                          : "text-slate-400",
                    )}
                  >
                    {format(d, "d")}
                  </div>
                  <Link
                    href={`/dashboard/new?date=${key}`}
                    onClick={(e) => e.stopPropagation()}
                    title={`Schedule a post on ${format(d, "dd MMM yyyy")}`}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-brand-100 hover:text-brand-600 group-hover:opacity-100"
                    aria-label={`Schedule on ${key}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] leading-tight text-white",
                        p.status === "published"
                          ? "bg-emerald-500"
                          : p.status === "failed"
                            ? "bg-red-500"
                            : "bg-brand-500",
                      )}
                    >
                      {formatKarachi(p.scheduled_for, {
                        hour: "2-digit",
                        minute: "2-digit",
                        year: undefined,
                        month: undefined,
                        day: undefined,
                      })}{" "}
                      {p.caption}
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="px-1 text-[10px] text-slate-500">
                      +{dayPosts.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedKey && (
        <div className="card animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              {selectedKey} — {selectedPosts.length}{" "}
              {selectedPosts.length === 1 ? "post" : "posts"}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedKey(null)}
              className="btn-ghost !p-1.5"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedPosts.length === 0 ? (
            <p className="text-sm text-slate-400">
              No posts on this day.{" "}
              <Link
                href={`/dashboard/new?date=${selectedKey}`}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Schedule one →
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedPosts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {p.caption || "(No caption)"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatKarachi(p.scheduled_for)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
