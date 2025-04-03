import { authClient } from "lib/auth-client";

function ProfilUtilisateur() {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  // session.user contiendra id, email, name, firstName, lastName, role, etc.

  if (isPending) return <p>Chargement...</p>;
  if (error) return <p>Erreur: {error.message}</p>;
  if (!session) return <p>Non connecté</p>;

  return (
    <div>
      <h1>Bonjour {session.user.firstName} !</h1>
      <p>Email: {session.user.email}</p>
      <p>Rôle: {session.user.role}</p>
    </div>
  );
}
