interface StatTileProps {
  value: string;
  label: string;
  accent?: "pink" | "lavender" | "blue" | "plum";
}

const accentStyles: Record<string, string> = {
  pink: "border-t-[3px] border-t-[#e8b4b8] bg-gradient-to-br from-[#fff6f7] to-white",
  lavender: "border-t-[3px] border-t-[#b8a9c9] bg-gradient-to-br from-[#f7f5fb] to-white",
  blue: "border-t-[3px] border-t-[#4a5d8a] bg-gradient-to-br from-[#f3f5fa] to-white",
  plum: "border-t-[3px] border-t-[#5d4e6d] bg-gradient-to-br from-[#f5f3f7] to-white",
};

export default function StatTile({ value, label, accent = "lavender" }: StatTileProps) {
  return (
    <div className={`rounded-xl shadow-sm border border-lacuna-lavender/30 px-4 py-5 sm:p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default ${accentStyles[accent]}`}>
      <p className="text-2xl sm:text-3xl font-bold text-lacuna-plum tracking-tight">{value}</p>
      <p className="text-xs sm:text-sm text-lacuna-blue/80 mt-1.5 font-medium leading-snug">{label}</p>
    </div>
  );
}
