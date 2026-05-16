import FaroExperience from "@/components/FaroExperience";
import { argentinaWorkDataset, crossCountryCaseFiles } from "@/lib/caseRepository";

export default function Home() {
  return (
    <FaroExperience
      dataset={argentinaWorkDataset}
      crossCountryCases={crossCountryCaseFiles}
    />
  );
}
