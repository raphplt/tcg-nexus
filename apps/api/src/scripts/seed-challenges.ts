import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Challenge } from "../challenge/entities/challenge.entity";
import { ActiveChallenge } from "../challenge/entities/active-challenge.entity";
import {
  ChallengeType,
  ChallengeActionType,
} from "../challenge/enums/challenge.enum";

dotenv.config();

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.DATABASE_NAME || "tcg_nexus",
  entities: [Challenge, ActiveChallenge],
  synchronize: true,
});

async function runSeed() {
  await AppDataSource.initialize();
  const challengeRepo = AppDataSource.getRepository(Challenge);

  console.log("Seeding default challenges into database...");

  const count = await challengeRepo.count();
  let defaultChallenges: Challenge[] = [];

  if (count > 0) {
    console.log("Challenges exist already. Fetching them...");
    defaultChallenges = await challengeRepo.find();
  } else {
    defaultChallenges = [
      challengeRepo.create({
        title: "Collectionneur débutant",
        description: "Ajouter 3 cartes à votre wishlist ou collection",
        type: ChallengeType.DAILY,
        actionType: ChallengeActionType.ADD_CARD,
        targetValue: 3,
        rewardXp: 50,
      }),
      challengeRepo.create({
        title: "Curieux des decks",
        description: "Consulter 2 decks de la communauté",
        type: ChallengeType.DAILY,
        actionType: ChallengeActionType.VIEW_DECK,
        targetValue: 2,
        rewardXp: 50,
      }),
      challengeRepo.create({
        title: "Expert en construction",
        description: "Consulter 8 decks",
        type: ChallengeType.WEEKLY,
        actionType: ChallengeActionType.VIEW_DECK,
        targetValue: 8,
        rewardXp: 150,
      }),
      challengeRepo.create({
        title: "Puits sans fond",
        description: "Ajouter 10 cartes à vos collections",
        type: ChallengeType.WEEKLY,
        actionType: ChallengeActionType.ADD_CARD,
        targetValue: 10,
        rewardXp: 200,
      }),
    ];
    await challengeRepo.save(defaultChallenges);
    console.log(
      `Successfully inserted ${defaultChallenges.length} challenges into the Database.`,
    );
  }

  const activeChallengeRepo = AppDataSource.getRepository(ActiveChallenge);
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  tmrw.setHours(0, 0, 0, 0);

  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  endOfWeek.setHours(0, 0, 0, 0);

  const activeDailies = defaultChallenges
    .filter((c) => c.type === ChallengeType.DAILY)
    .map((c) => activeChallengeRepo.create({ challenge: c, expiresAt: tmrw }));
  const activeWeeklies = defaultChallenges
    .filter((c) => c.type === ChallengeType.WEEKLY)
    .map((c) =>
      activeChallengeRepo.create({ challenge: c, expiresAt: endOfWeek }),
    );

  await activeChallengeRepo.save([...activeDailies, ...activeWeeklies]);
  console.log("Active Challenges generated for current rotation.");

  console.log("Done.");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Error seeding challenges:", err);
  process.exit(1);
});
