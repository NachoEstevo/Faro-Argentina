import AdminAportesView from "../../../components/Admin/AdminAportesView";

export const metadata = {
  title: "Admin aportes | Faro",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAportesPage() {
  return <AdminAportesView />;
}
