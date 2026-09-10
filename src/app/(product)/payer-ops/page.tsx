import PayerOpsPage from "@/app/sections/PayerOpsPage";
import payerOpsSnapshot from "@/data/payer-ops-benchmarks.snapshot.json";

export const revalidate = 86_400;

export default function Page() {
  const verifiedOn = payerOpsSnapshot.fetchedAt.slice(0, 10);
  return <PayerOpsPage sourcesLastVerified={verifiedOn} />;
}
