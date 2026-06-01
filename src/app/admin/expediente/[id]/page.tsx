import AdminExpedienteReviewView from "../../../../components/Admin/AdminExpedienteReviewView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Admin expediente ${decodeURIComponent(id)} | Faro`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminExpedientePage({ params }: PageProps) {
  const { id } = await params;
  return <AdminExpedienteReviewView caseId={decodeURIComponent(id)} />;
}
