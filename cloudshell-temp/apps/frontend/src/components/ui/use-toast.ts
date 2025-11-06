import { toast as base } from "sonner"; // or shadcn's toast if included

export const toast = (opts: { 
  title?: string; 
  description?: string; 
  variant?: "default" | "destructive" 
}) =>
  base[opts.variant === "destructive" ? "error" : "success"](
    opts.title ?? "", 
    { description: opts.description }
  );

