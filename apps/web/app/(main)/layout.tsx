import SidebarLayout from "@/components/Layout/SidebarLayout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
