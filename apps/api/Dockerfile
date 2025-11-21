# Utiliser l'image Node.js officielle comme base
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --only=production

# Copier le reste du code source
COPY . .

# Construire l'application
RUN npm run build

# Exposer le port
EXPOSE 3001

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Changer la propriété des fichiers
RUN chown -R nestjs:nodejs /app
USER nestjs

# Démarrer l'application
CMD ["npm", "run", "start:prod"]
