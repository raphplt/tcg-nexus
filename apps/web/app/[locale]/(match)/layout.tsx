import { Toaster } from "react-hot-toast";

export default function MatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-slate-950">
      {children}
      <Toaster />
    </div>
  );
}
