import { useState, useEffect } from "react";
import { Task } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { clsx } from "clsx";
import { differenceInMilliseconds, differenceInHours, parseISO, format } from "date-fns";
import { useTranslation } from "react-i18next";

interface TaskCardProps {
  task: Task;
  index: number;
  onComplete: (id: string) => void;
  notionToken: string;
}

export function TaskCard({ task, index, onComplete, notionToken }: TaskCardProps) {
  const { t } = useTranslation();
  const [complete, setComplete] = useState(task.status === "Done");
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [objectiveRemaining, setObjectiveRemaining] = useState<string>("");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "overdue">("normal");

  useEffect(() => {
    if (complete) return;

    const calcTime = (dateStr: string | null) => {
      if (!dateStr) return { str: "", status: "normal" as const };

      const now = new Date();
      const targetStr = dateStr.includes("T") ? dateStr : `${dateStr}T23:59:59`;
      const target = parseISO(targetStr);

      const diffMs = differenceInMilliseconds(target, now);
      const diffHrs = differenceInHours(target, now);

      let status: "normal" | "urgent" | "overdue" = "normal";

      if (diffMs < 0) {
        status = "overdue";
        return { str: t("task.overdue"), status };
      }

      if (diffHrs < 3) {
        status = "urgent";
        // HH:MM:SS
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        return { str: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, status };
      } else if (diffHrs < 72) { // TODO(good-first-issue): Extract '72' (3 days) into a named constant.
        return { str: `${diffHrs}h`, status };
      } else {
        const days = Math.floor(diffHrs / 24);
        return { str: `${days}d`, status };
      }
    };

    const updateTimes = () => {
      const taskTime = calcTime(task.do_date);
      setTimeRemaining(taskTime.str);
      setUrgency(taskTime.status);

      const objTime = calcTime(task.objective_deadline);
      setObjectiveRemaining(objTime.str);
    }

    updateTimes();

    const interval = setInterval(() => {
      updateTimes();
    }, urgency === "urgent" ? 1000 : 60000);

    return () => clearInterval(interval);
  }, [task.do_date, task.objective_deadline, complete, urgency]);


  const handleCheck = async () => {
    const newState = !complete;
    setComplete(newState);
    if (newState) {
      onComplete(task.id);
    }

    try {
      await invoke("mark_task_complete", { token: notionToken, pageId: task.id, completed: newState });
    } catch (e) {
      console.error("Failed to sync completion", e);
      setComplete(!newState); // Revert on failure
    }
  };

  // Format deadline for display (e.g. "Today", "Oct 24")
  const displayDate = task.do_date ? format(parseISO(task.do_date), "MMM d") : "";

  return (
    <div
      className={clsx(
        "w-full py-2 px-2 transition-colors duration-200 border-b border-brand-gray/20 dark:border-brand-gray/10 last:border-0",
        complete ? "opacity-50" : "",
        !complete && urgency === "urgent" ? "bg-red-50 dark:bg-red-900/20" : "hover:bg-brand-gray/10 dark:hover:bg-brand-gray/5"
      )}
    >
      <div className="flex flex-col gap-0.5">
        {/* Top Row: Number, Title, Countdown */}
        <div className="flex items-center gap-2">
          {/* Checkbox / Number Wrapper */}
          <div className="flex items-center gap-1 min-w-[20px] shrink-0">
            <span className="text-brand-gray dark:text-slate-400 text-xs font-mono w-3 text-right">{index + 1}.</span>
            <input
              type="checkbox"
              checked={complete}
              onChange={handleCheck}
              className="accent-brand-primary cursor-pointer w-3.5 h-3.5"
            />
          </div>

          {/* Title - allow shrinking but prioritize text visibility */}
          <div className={clsx("flex-1 min-w-0 text-sm font-medium text-brand-dark dark:text-white truncate", complete && "line-through decoration-brand-gray")}>
            {task.title}
          </div>

          {/* Countdown / Deadline - compact */}
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            {displayDate && <span className="text-[#5f7c8c] dark:text-white hidden xs:block">{displayDate}</span>}

            {timeRemaining && !complete && (
              <span className={clsx(
                "font-bold text-right min-w-[2rem]",
                urgency === "urgent" ? "text-red-500 animate-pulse" : "text-brand-primary dark:text-sky-400"
              )}>
                {timeRemaining}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Objective / Context (Italicized) */}
        {(task.objective_name || task.objective_deadline) && (
          // TODO(good-first-issue): Replace hardcoded hex color '#5f7c8c' with a Tailwind class or theme variable.
          <div className="pl-6 text-[10px] sm:text-xs text-[#5f7c8c] dark:text-white italic flex items-center justify-between gap-2">
            <span className="truncate flex-1">{task.objective_name}</span>
            <div className="flex items-center gap-2 font-mono shrink-0">
              {task.objective_deadline && (
                <span className="hidden xs:inline">{format(parseISO(task.objective_deadline), "MMM d")}</span>
              )}
              {objectiveRemaining && (
                <span className="text-right font-bold opacity-90">
                  {objectiveRemaining}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
