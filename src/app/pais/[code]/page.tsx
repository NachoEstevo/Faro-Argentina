import { notFound } from "next/navigation";
import type { Metadata } from "next";

import FaroExperience from "@/components/FaroExperience";
import {
  argentinaWorkDataset,
  crossCountryCaseFiles,
  investigatorCaseFiles,
} from "@/lib/caseRepository";
import { getCountryConfig, isCountryCode } from "@/lib/data/countries";

type RouteParams = Promise<{ code: string }>;
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { code } = await params;
  const upper = code.toUpperCase();
  if (!isCountryCode(upper)) {
    return {
      title: "País no encontrado",
    };
  }

  const country = getCountryConfig(upper);
  if (!country) {
    return {
      title: "País no encontrado",
    };
  }

  const caseCount = country.caseCount.toLocaleString("es-AR");
  return {
    title: `${country.name} - ${caseCount} expedientes`,
    description: `Explora ${caseCount} expedientes verificables de ${country.name} con fuentes oficiales, receipts y caveats.`,
    alternates: {
      canonical: `/pais/${upper.toLowerCase()}`,
    },
    openGraph: {
      title: `Faro ${country.name}`,
      description: `${caseCount} expedientes verificables con fuentes oficiales.`,
      images: [
        {
          url: "/brand/faro-og.png",
          width: 1200,
          height: 630,
          alt: `Faro ${country.name}`,
        },
      ],
    },
  };
}

export default async function PaisPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams?: PageSearchParams;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  if (!isCountryCode(upper)) {
    notFound();
  }

  const search = (await searchParams) ?? {};
  const initialMode =
    readParam(search.mode) === "explorer"
      ? "explorer"
      : readParam(search.mode) === "aportes"
        ? "aportes"
        : "map";
  const initialCaseId = readParam(search.case);

  return (
    <FaroExperience
      dataset={argentinaWorkDataset}
      crossCountryCases={crossCountryCaseFiles}
      explorerCases={investigatorCaseFiles}
      initialCountry={upper}
      initialEntryOpen={false}
      initialMode={initialMode}
      initialCaseId={initialCaseId}
    />
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function generateStaticParams() {
  return [{ code: "AR" }, { code: "PE" }, { code: "CL" }];
}
