"use client";

import { useEffect, useState } from "react";

function formatDate(timeZone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(new Date());
}

export function TodayDate({ timeZone, initialDate }: { timeZone: string; initialDate: string }) {
  const [label, setLabel] = useState(initialDate);

  useEffect(() => {
    const refresh = () => setLabel(formatDate(timeZone));
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [timeZone]);

  return <p className="eyebrow" aria-label="Текущая дата">{label}</p>;
}
