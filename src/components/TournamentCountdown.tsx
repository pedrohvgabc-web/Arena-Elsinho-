import { useEffect, useState } from "react";
import { TOURNAMENT } from "@/lib/site";

const TARGET = Date.parse(TOURNAMENT.countdownAt);
const LABELS = ["dias", "horas", "min", "seg"];

export function TournamentCountdown() {
  const [time, setTime] = useState(["--", "--", "--", "--"]);

  useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, Math.floor((TARGET - Date.now()) / 1000));
      setTime([
        String(Math.floor(seconds / 86_400)).padStart(2, "0"),
        String(Math.floor((seconds % 86_400) / 3_600)).padStart(2, "0"),
        String(Math.floor((seconds % 3_600) / 60)).padStart(2, "0"),
        String(seconds % 60).padStart(2, "0"),
      ]);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="cd"
      role="timer"
      aria-label={`Contagem regressiva para ${TOURNAMENT.date} às ${TOURNAMENT.time}`}
      aria-live="off"
    >
      {time.map((value, index) => (
        <div key={LABELS[index]}>
          <strong>{value}</strong>
          <span className="mono">{LABELS[index]}</span>
        </div>
      ))}
    </div>
  );
}
