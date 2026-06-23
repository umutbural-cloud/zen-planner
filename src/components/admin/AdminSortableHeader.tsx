type AdminSortableHeaderDirection = "asc" | "desc";

type AdminSortableHeaderProps = {
  label: string;
  active: boolean;
  direction: AdminSortableHeaderDirection | null;
  onClick: () => void;
};

export const AdminSortableHeader = ({ label, active, direction, onClick }: AdminSortableHeaderProps) => {
  const indicator = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="inline-flex w-3 justify-center text-[10px]" aria-hidden="true">
        {indicator}
      </span>
    </button>
  );
};
