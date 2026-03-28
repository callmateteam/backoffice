"use client";

import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface AssigneeFilterProps {
  assignees: string[];
  selected: string;
  onChange: (assignee: string) => void;
}

export function AssigneeFilter({ assignees, selected, onChange }: AssigneeFilterProps) {
  if (assignees.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-gray-400" />
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange("all")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-all",
            selected === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
        >
          전체
        </button>
        {assignees.map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              selected === a
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {a.split("@")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
