import FaroExperience from "@/components/FaroExperience";
import { argentinaWorkDataset } from "@/lib/caseRepository";

export default function Home() {
  return <FaroExperience dataset={argentinaWorkDataset} />;
}
