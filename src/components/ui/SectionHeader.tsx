import { cn } from "@/lib/utils/cn";

interface SectionHeaderProps {
  title: string;
  description?: string;
  descriptionClassName?: string;
}

export default function SectionHeader(
  { title, description, descriptionClassName }: SectionHeaderProps,
) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-lacuna-plum">{title}</h2>
      {description
        ? (
          <p
            className={cn(
              "mt-1 leading-relaxed text-lacuna-blue",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        )
        : null}
    </div>
  );
}
