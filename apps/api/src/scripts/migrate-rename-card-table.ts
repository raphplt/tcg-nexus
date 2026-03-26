import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load env from local .env by default
dotenv.config();

type RegclassRow = { reg: string | null };

type CountRow = { count: string };

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  entities: []
});

async function tableExists(queryRunner: any, table: string): Promise<boolean> {
  const rows = (await queryRunner.query(
    `SELECT to_regclass('public.${table}') AS reg;`
  )) as RegclassRow[];
  return Boolean(rows[0]?.reg);
}

async function columnExists(
  queryRunner: any,
  table: string,
  column: string
): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1;`,
    [table, column]
  );
  return rows.length > 0;
}

async function renameColumnIfExists(
  queryRunner: any,
  table: string,
  from: string,
  to: string
) {
  const exists = await columnExists(queryRunner, table, from);
  if (!exists) {
    return;
  }
  await queryRunner.query(`ALTER TABLE public.${table} RENAME COLUMN ${from} TO ${to};`);
}

async function main() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    const hasPokemonCard = await tableExists(queryRunner, 'pokemon_card');
    const hasCard = await tableExists(queryRunner, 'card');

    if (hasPokemonCard && !hasCard) {
      console.log('Renaming table pokemon_card -> card');
      await queryRunner.query('ALTER TABLE public.pokemon_card RENAME TO card;');
    } else if (hasPokemonCard && hasCard) {
      const [{ count: cardCountRaw }] = (await queryRunner.query(
        'SELECT COUNT(*)::int AS count FROM public.card;'
      )) as CountRow[];
      const [{ count: pokemonCountRaw }] = (await queryRunner.query(
        'SELECT COUNT(*)::int AS count FROM public.pokemon_card;'
      )) as CountRow[];
      const cardCount = Number(cardCountRaw);
      const pokemonCount = Number(pokemonCountRaw);

      if (cardCount === 0 && pokemonCount > 0) {
        console.log('card table empty. Dropping card and renaming pokemon_card -> card.');
        await queryRunner.query('DROP TABLE public.card CASCADE;');
        await queryRunner.query('ALTER TABLE public.pokemon_card RENAME TO card;');
      } else if (pokemonCount === 0 && cardCount > 0) {
        console.log('pokemon_card table empty. Dropping pokemon_card.');
        await queryRunner.query('DROP TABLE public.pokemon_card CASCADE;');
      } else if (pokemonCount === 0 && cardCount === 0) {
        console.log('Both card and pokemon_card are empty. Dropping pokemon_card.');
        await queryRunner.query('DROP TABLE public.pokemon_card CASCADE;');
      } else {
        throw new Error(
          'Both card and pokemon_card have data. Resolve manually before renaming.'
        );
      }
    } else {
      console.log('No pokemon_card table found. Nothing to rename.');
    }

    await renameColumnIfExists(queryRunner, 'listing', 'pokemon_card_id', 'card_id');
    await renameColumnIfExists(queryRunner, 'price_history', 'pokemon_card_id', 'card_id');
    await renameColumnIfExists(queryRunner, 'card_events', 'pokemon_card_id', 'card_id');
    await renameColumnIfExists(
      queryRunner,
      'card_popularity_metrics',
      'pokemon_card_id',
      'card_id'
    );

    console.log('✅ Migration done.');
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
