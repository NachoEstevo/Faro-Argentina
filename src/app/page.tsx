import FaroExperience from "@/components/FaroExperience";
import {
  argentinaWorkDataset,
  crossCountryCaseFiles,
  investigatorCaseFiles,
} from "@/lib/caseRepository";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams?: PageSearchParams }) {
  const params = (await searchParams) ?? {};
  const initialMode = readParam(params.mode) === "explorer" ? "explorer" : "map";
  const country = readParam(params.country);
  const initialCountry = country === "PE" || country === "CL" ? country : "AR";
  const initialEntryOpen = initialMode !== "explorer" && readParam(params.demo) !== "map";

  return (
    <FaroExperience
      dataset={argentinaWorkDataset}
      crossCountryCases={crossCountryCaseFiles}
      explorerCases={investigatorCaseFiles}
      initialCountry={initialCountry}
      initialEntryOpen={initialEntryOpen}
      initialMode={initialMode}
    />
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
