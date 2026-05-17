import { notFound } from "next/navigation";

import PrintableCaseReport from "@/components/PrintableCaseReport";
import { getCaseReportById } from "@/lib/caseRepository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const report = getCaseReportById(decodeURIComponent(id));
  if (!report) {
    return {
      title: "Informe no encontrado - Faro",
    };
  }

  return {
    title: `Informe Faro - ${report.summary.title}`,
    description: "Informe imprimible de expediente Faro con fuente oficial, caveats y próximos pasos.",
  };
}

export default async function CaseReportPage({ params }: PageProps) {
  const { id } = await params;
  const report = getCaseReportById(decodeURIComponent(id));
  if (!report) notFound();

  return <PrintableCaseReport report={report} />;
}
