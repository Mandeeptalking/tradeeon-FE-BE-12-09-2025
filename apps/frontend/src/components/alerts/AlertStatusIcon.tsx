import { Circle, PauseCircle, Activity } from "lucide-react";

export default function AlertStatusIcon({
  status,
  recent
}: { status: "active" | "paused"; recent?: boolean }) {
  if (status === "paused") return <PauseCircle className="h-4 w-4 text-gray-400" />;
  if (recent) return <Activity className="h-4 w-4 text-green-500 animate-pulse" />;
  return <Circle className="h-4 w-4 text-green-400" />;
}



