/** Visible basis words next to a figure. The number itself is unchanged. */
export default function ValueBasisMark({ label }: { label: string }) {
  return (
    <span className="font-normal text-lacuna-blue/75">
      {" · "}
      {label}
    </span>
  );
}
