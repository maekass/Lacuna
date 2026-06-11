interface SectionHeaderProps {
  title: string;
  description?: string;
}

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-lacuna-plum">{title}</h2>
      {description ? (
        <p className="text-lacuna-blue mt-1 leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
