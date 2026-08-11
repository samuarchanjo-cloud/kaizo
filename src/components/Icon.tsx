export type IconName = "dashboard" | "entries" | "budgets" | "orders" | "customers" | "vehicles" | "agenda" | "post-sale" | "finance" | "reports" | "settings" | "more" | "bell" | "plus" | "search" | "spark" | "arrow" | "close" | "menu" | "check" | "clock" | "money" | "history" | "edit" | "trash" | "car" | "camera";

export function Icon({ name, className = "" }: { name: IconName | string; className?: string }) {
  return <svg className={`icon ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "dashboard" && <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>}
    {name === "orders" && <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>}
    {name === "entries" && <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /><path d="M9 3v4M15 3v4" /></>}
    {name === "budgets" && <><path d="M5 3h14v18H5z" /><path d="M8 7h8M8 11h8M8 15h4" /><path d="m15 16 1.5 1.5L19 14" /></>}
    {name === "customers" && <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.8M17 15a5 5 0 0 1 3.5 5" /></>}
    {(name === "vehicles" || name === "car") && <><path d="m5 11 1.4-4h11.2l1.4 4" /><path d="M3 12.5A1.5 1.5 0 0 1 4.5 11h15a1.5 1.5 0 0 1 1.5 1.5V18H3z" /><path d="M5 18v2M19 18v2M6.5 14.5h.01M17.5 14.5h.01" /></>}
    {name === "finance" && <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" /><path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" /></>}
    {name === "agenda" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>}
    {name === "post-sale" && <><path d="M20 11a8 8 0 1 1-3-6.2" /><path d="M20 4v7h-7" /><path d="M9 12l2 2 4-5" /></>}
    {name === "reports" && <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>}
    {name === "settings" && <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>}
    {name === "plus" && <path d="M12 5v14M5 12h14" />}
    {name === "search" && <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>}
    {name === "spark" && <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 3v4M21 5h-4" />}
    {name === "arrow" && <path d="M5 12h14m-5-5 5 5-5 5" />}
    {name === "close" && <path d="m6 6 12 12M18 6 6 18" />}
    {name === "menu" && <path d="M4 7h16M4 12h16M4 17h16" />}
    {name === "check" && <path d="m5 12 4 4L19 6" />}
    {name === "clock" && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
    {name === "money" && <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.7-.5-1.6-.8-2.6-.8-1.5 0-2.7.8-2.7 2s1.1 1.7 2.8 2.1 2.8.9 2.8 2.3-1.2 2.2-2.9 2.2c-1.1 0-2.2-.4-3-1M12.5 5.7v12.6" /></>}
    {name === "history" && <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>}
    {name === "edit" && <><path d="M4 20h4l11-11-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>}
    {name === "trash" && <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>}
    {name === "camera" && <><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10H3V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="12.5" r="3.5" /></>}
    {name === "more" && <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>}
    {name === "bell" && <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>}
  </svg>;
}
