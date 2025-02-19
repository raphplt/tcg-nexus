# TCG Nexus Project

Ce monorepo contient une application front-end en Next.js, une API en NestJS, et plusieurs microservices.

## Structure du projet

- `apps/api`: Application front-end en [Next.js](https://nextjs.org/)
- `apps/web`: Application back-end en [NestJS](https://nestjs.com/)
- `apps/fetch`: Microservice de fetch en [Express](https://expressjs.com/)
- `apps/doc`: Documentation du projet

## Prérequis

- Node.js (version 18 ou supérieure) [Télécharger](https://nodejs.org/)
- npm (gestionnaire de paquets) [Télécharger](https://www.npmjs.com/)
- MySQL (base de données) [Télécharger](https://www.mysql.com/)
- Turborepo (gestionnaire de monorepo) [Télécharger](https://turbo.build/)

## Installation

Clonez le dépôt et installez les dépendances :

```sh
git clone https://github.com/raphplt/tcg-nexus
cd tcg-nexus
npm install
```

## Seed de la base de données

La commande ci dessous permet de remplir la base de données à partir des fichiers JSON présents dans `apps/api/src/common/data` :

```sh
npm run seed
```

## Développement

Pour lancer les applications en mode développement :

```sh
turbo dev
```

Ou bien :

```sh
npm dev    
```

Cela lancera les applications front-end et back-end.

## Build

Pour construire toutes les applications et les packages :

```sh
turbo build
```

## Lancer les tests

Pour exécuter les tests unitaires :

```sh
turbo test
```

## Déploiement

Les instructions de déploiement dépendent de votre infrastructure. Voici un exemple de déploiement avec Docker :

```sh
docker-compose up --build
```

## Utilisation du microservice de fetch

Le microservice de fetch est accessible via l'URL suivante :

```sh
http://localhost:3005/tcgdex
```

## Liens utiles

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Turbo Documentation](https://turbo.hotwired.dev/)

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
