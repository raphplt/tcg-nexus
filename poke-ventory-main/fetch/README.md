# Fetch from TCGdex

Ce microservice est une application Express.js qui permet de récupérer des données sur les jeux de cartes à jouer. Il fournit divers endpoints pour récupérer des informations sur les cartes, séries, ensembles et plus.

1. Installer les dépendances :
   ```sh
   npm install
   ```

## Usage

1. Démarrer le serveur :

   ```sh
   npm start
   ```

2. Le serveur sera accessible à cette adresse `http://localhost:3005`.

## API Endpoints

- **Get a card by ID**

  ```http
  GET /tcgdex/cards/:id
  ```

- **Get all series**

  ```http
  GET /tcgdex/series
  ```

- **Get series details**

  ```http
  GET /tcgdex/seriesDetails
  ```

- **Get a series by ID**

  ```http
  GET /tcgdex/series/:id
  ```

- **Get a set by ID**

  ```http
  GET /tcgdex/sets/:id
  ```

- **Get all sets**

  ```http
  GET /tcgdex/sets
  ```

- **Get a set with all its cards**

  ```http
  GET /tcgdex/setCard/:id
  ```

- **Get a complete series (bloc) with all its sets and their cards**
  ```http
  GET /tcgdex/bloc/:id
  ```
