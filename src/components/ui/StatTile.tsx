interface StatTileProps {
  value: string;
  label: string;
}

export default function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-6 hover:shadow-md transition-shadow">
      <p className="text-3xl font-bold text-lacuna-plum">{value}</p>
      <p className="text-sm text-lacuna-blue mt-1">{label}</p>
    </div>
  );
}
