interface StatTileProps {
  value: string;
  label: string;
  accent?: "pink" | "lavender" | "blue" | "plum";
}

export default function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="bg-white rounded-lg border border-lacuna-lavender/25 px-4 py-5 sm:p-6 hover:border-lacuna-lavender/50 transition-colors">
      <p className="text-2xl sm:text-3xl font-bold text-lacuna-plum tracking-tight">{value}</p>
      <p className="text-xs sm:text-sm text-lacuna-blue/70 mt-1.5 leading-snug">{label}</p>
    </div>
  );
}
