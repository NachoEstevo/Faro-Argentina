import { notFound } from "next/navigation";

import FaroExperience from "@/components/FaroExperience";
import {
  argentinaWorkDataset,
  crossCountryCaseFiles,
  investigatorCaseFiles,
} from "@/lib/caseRepository";
import { isCountryCode } from "@/lib/data/countries";

type RouteParams = Promise<{ code: string }>;
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const initialMode = readParam(search.mode) === "explorer" ? "explorer" : "map";

  return (
    <FaroExperience
      dataset={argentinaWorkDataset}
      crossCountryCases={crossCountryCaseFiles}
      explorerCases={investigatorCaseFiles}
      initialCountry={upper}
      initialEntryOpen={false}
      initialMode={initialMode}
    />
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function generateStaticParams() {
  return [{ code: "AR" }, { code: "PE" }, { code: "CL" }];
}
