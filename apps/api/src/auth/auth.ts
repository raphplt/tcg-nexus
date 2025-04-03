import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
// import { TypeOrmDataSource } from './data-source'; // si on veut réutiliser la connexion TypeORM

export const auth = betterAuth({
  // URL de base où le serveur NestJS est accessible
  baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
  basePath: '/api/auth/sign-up', // note le tiret ici
  secret: process.env.AUTH_SECRET ?? 'une-clé-secrète-32char',

  // Configuration base de données (PostgreSQL via Pool PG ou adaptateur Kysely)
  database: new Pool({ connectionString: process.env.DATABASE_URL }),

  // Activation de l'auth email + mot de passe
  emailAndPassword: { enabled: true },

  // Configuration du provider Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // mapping des données du profil Google vers notre user (voir "Champs supplémentaires" ci-dessous)
      mapProfileToUser: (profile) => ({
        firstName: profile.given_name,
        lastName: profile.family_name
      })
    }
  },

  // Configuration des champs utilisateur supplémentaires pour correspondre à notre entité TypeORM
  user: {
    additionalFields: {
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false
      }
      // 'role' par défaut "user", et input:false pour ne pas le renseigner depuis le front lors du signup
    }
  },

  // Origines de confiance pouvant faire des requêtes (pour sécuriser OAuth et cookies)
  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],

  // Paramètres avancés des cookies de session
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true, // mettre à false si en développement sans HTTPS
      sameSite: 'none' // nécessaire pour partager le cookie entre domaines (front/back différents)
    }
  }
});
