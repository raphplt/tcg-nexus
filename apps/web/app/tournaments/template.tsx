import { UserTournamentsProvider } from "@/contexts/UserTournamentsContext";

type Props = {
  children: React.ReactNode;
};

const Template = async ({ children }: Props) => {
  return (
    <UserTournamentsProvider>
      <main className="w-full h-screen">{children}</main>
    </UserTournamentsProvider>
  );
};

export default Template;
