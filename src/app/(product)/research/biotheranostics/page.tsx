import type { Metadata } from "next";
import BiotheranosticsDossier from "@/components/BiotheranosticsDossier";
import {
  BIOTHERANOSTICS_DOSSIER,
  BIOTHERANOSTICS_DOSSIER_PATH,
} from "@/lib/research/biotheranosticsDossier";

const { title, description } = BIOTHERANOSTICS_DOSSIER;

export const metadata: Metadata = {
  title: `${title} · Lacuna`,
  description,
  alternates: { canonical: BIOTHERANOSTICS_DOSSIER_PATH },
  openGraph: {
    title,
    description,
    url: BIOTHERANOSTICS_DOSSIER_PATH,
    type: "article",
  },
  twitter: { card: "summary", title, description },
};

export default function Page() {
  return <BiotheranosticsDossier />;
}
