import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export const SettingsSection = ({ title, description, children, className }: SettingsSectionProps) => (
  <section className={cn("rounded-lg bg-white px-6 py-5", className)}>
    <div className="mb-5">
      <h2 className="text-base font-medium tracking-normal text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);
