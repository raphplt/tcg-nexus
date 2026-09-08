import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { DataSource } from "typeorm";
import { Card } from "../src/card/entities/card.entity";
import {
  CardState,
  CardStateCode,
} from "../src/card-state/entities/card-state.entity";
import { CollectionItem } from "../src/collection-item/entities/collection-item.entity";
import { CollectionBulkService } from "../src/collection/collection-bulk.service";
import {
  BulkOperationStatus,
  CollectionBulkOperation,
} from "../src/collection/entities/collection-bulk-operation.entity";
import { CollectionBulkOperations1789100000000 } from "../src/migrations/1789100000000-CollectionBulkOperations";
import { createE2eApp } from "./helpers/app";
import { createUser, TestUser } from "./helpers/auth";
import { ensureCard } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Collection bulk operations (PostgreSQL)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let bulk: CollectionBulkService;
  let owner: TestUser;
  let card: Card;
  let nearMint: CardState;
  let collectionId: string;

  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });

  const createCollection = async (): Promise<string> =>
    (
      await request(server)
        .post("/collection")
        .set(auth(owner))
        .send({ name: `Bulk E2E ${Date.now()}`, isPublic: false })
        .expect(201)
    ).body.id;

  const items = () =>
    database.getRepository(CollectionItem).find({
      where: { collection: { id: collectionId } },
      order: { id: "ASC" },
    });

  const importCsv = (csvContent: string, body: Record<string, unknown> = {}) =>
    request(server)
      .post(`/collection/${collectionId}/import/csv`)
      .set(auth(owner))
      .send({ csvContent, ...body });

  const undo = (operationId: string) =>
    request(server)
      .post(`/collection/${collectionId}/items/undo-operation`)
      .set(auth(owner))
      .send({ operationId });

  const exportCsv = async (): Promise<string> =>
    (
      await request(server)
        .get(`/collection/${collectionId}/export/csv`)
        .set(auth(owner))
        .expect(200)
    ).text;

  const csv = (rows: string[]) =>
    ["cardId,variant,language,cardState,quantity,notes", ...rows].join("\n");

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    bulk = app.get(CollectionBulkService);
    owner = await createUser(server);
    card = await ensureCard(app);
    await database
      .getRepository(CardState)
      .createQueryBuilder()
      .insert()
      .values([{ code: CardStateCode.NM, label: "Near Mint" }])
      .orIgnore()
      .execute();
    nearMint = await database
      .getRepository(CardState)
      .findOneByOrFail({ code: CardStateCode.NM });
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    collectionId = await createCollection();
  });

  it("adds copies to an existing stack and undoes only what it added", async () => {
    // Inventory that predates the import, which undo must not delete.
    await database.getRepository(CollectionItem).save({
      collection: { id: collectionId },
      pokemonCard: card,
      cardState: nearMint,
      variant: "normal",
      language: "fr",
      quantity: 1,
      quantityAvailable: 1,
    } as unknown as CollectionItem);

    const result = (
      await importCsv(csv([`${card.id},normal,fr,NM,2,`]), {
        operationId: "op-existing",
      }).expect(201)
    ).body;
    expect(result.updatedCount).toBe(1);
    expect((await items())[0].quantity).toBe(3);

    const undone = (await undo("op-existing").expect(201)).body;

    // The audited defect: undo removed the whole pre-existing item.
    const remaining = await items();
    expect(undone.removedCount).toBe(0);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].quantity).toBe(1);
    expect(remaining[0].quantityAvailable).toBe(1);
  });

  it("removes only the items its own import created", async () => {
    await importCsv(csv([`${card.id},normal,fr,NM,2,`]), {
      operationId: "op-created",
    }).expect(201);
    expect(await items()).toHaveLength(1);

    const undone = (await undo("op-created").expect(201)).body;

    expect(undone.removedCount).toBe(1);
    expect(await items()).toHaveLength(0);
  });

  it("answers a replayed import from its recorded summary", async () => {
    const first = (
      await importCsv(csv([`${card.id},normal,fr,NM,2,`]), {
        operationId: "op-replay",
      }).expect(201)
    ).body;
    const replay = (
      await importCsv(csv([`${card.id},normal,fr,NM,2,`]), {
        operationId: "op-replay",
      }).expect(201)
    ).body;

    expect(replay).toEqual(first);
    expect((await items())[0].quantity).toBe(2);
  });

  it("keeps a later import from claiming an earlier operation's items", async () => {
    await importCsv(csv([`${card.id},normal,fr,NM,1,`]), {
      operationId: "first",
    }).expect(201);
    await importCsv(csv([`${card.id},normal,fr,NM,1,`]), {
      operationId: "second",
    }).expect(201);

    const stored = await items();
    expect(stored[0].provenance?.operationId).toBe("first");
    expect(stored[0].quantity).toBe(2);

    await undo("second").expect(201);
    expect((await items())[0].quantity).toBe(1);
  });

  it("round-trips values that contain commas, quotes and newlines", async () => {
    const notes = 'Signed, "mint" edition\nsecond line';
    await database.getRepository(CollectionItem).save({
      collection: { id: collectionId },
      pokemonCard: card,
      variant: "normal",
      language: "fr",
      printing: "1st_edition",
      notes,
      acquisitionCost: 12.5,
      acquisitionCurrency: "EUR",
      quantity: 1,
      quantityAvailable: 1,
    } as unknown as CollectionItem);

    const exported = await exportCsv();
    const second = await createCollection();
    await request(server)
      .post(`/collection/${second}/import/csv`)
      .set(auth(owner))
      .send({ csvContent: exported })
      .expect(201);

    const [imported] = await database.getRepository(CollectionItem).find({
      where: { collection: { id: second } },
    });
    expect(imported.notes).toBe(notes);
    expect(imported.printing).toBe("1st_edition");
    expect(Number(imported.acquisitionCost)).toBe(12.5);
    expect(imported.acquisitionCurrency).toBe("EUR");
  });

  it("refuses to replace a quantity below the copies a listing holds", async () => {
    const item = await database.getRepository(CollectionItem).save({
      collection: { id: collectionId },
      pokemonCard: card,
      cardState: nearMint,
      variant: "normal",
      language: "fr",
      quantity: 5,
      quantityAvailable: 2,
      quantityReserved: 3,
    } as unknown as CollectionItem);

    const result = (
      await importCsv(csv([`${card.id},normal,fr,NM,1,`]), {
        mode: "replace",
      }).expect(201)
    ).body;

    expect(result.skippedCount).toBe(1);
    const stored = await database
      .getRepository(CollectionItem)
      .findOneByOrFail({ id: item.id });
    expect(stored.quantity).toBe(5);
    expect(stored.quantityReserved).toBe(3);
  });

  it("keeps reserved copies out of an undo and reports the conflict", async () => {
    await importCsv(csv([`${card.id},normal,fr,NM,2,`]), {
      operationId: "op-reserved",
    }).expect(201);
    const [created] = await items();
    await database
      .getRepository(CollectionItem)
      .update({ id: created.id }, { quantityReserved: 1 });

    const undone = (await undo("op-reserved").expect(201)).body;

    expect(undone.conflicts).toHaveLength(1);
    expect(await items()).toHaveLength(1);
  });

  it("compensates an undo only once", async () => {
    await importCsv(csv([`${card.id},normal,fr,NM,2,`]), {
      operationId: "op-once",
    }).expect(201);

    const first = (await undo("op-once").expect(201)).body;
    const second = (await undo("op-once").expect(201)).body;

    expect(second).toEqual(first);
    const operation = await database
      .getRepository(CollectionBulkOperation)
      .findOneByOrFail({ operationId: "op-once" });
    expect(operation.status).toBe(BulkOperationStatus.UNDONE);
  });

  it("restores deleted items from their snapshot", async () => {
    const item = await database.getRepository(CollectionItem).save({
      collection: { id: collectionId },
      pokemonCard: card,
      variant: "normal",
      language: "fr",
      quantity: 4,
      quantityAvailable: 4,
      notes: "Kept safe",
    } as unknown as CollectionItem);

    const deleted = await bulk.bulkDelete(
      { id: owner.id, role: "user" } as never,
      { itemIds: [item.id] },
    );
    expect(await items()).toHaveLength(0);

    const undone = await bulk.undoOperation(
      { id: owner.id, role: "user" } as never,
      { operationId: deleted.operationId },
    );

    expect(undone.restoredCount).toBe(1);
    const [restored] = await items();
    expect(restored.quantity).toBe(4);
    expect(restored.notes).toBe("Kept safe");
  });

  // Declared last: rebuilding the tables from the migration leaves the migrated
  // column types in place, which later assertions on this database do not expect.
  it("adopts legacy import provenance as an already undone operation", async () => {
    await database.getRepository(CollectionItem).save({
      collection: { id: collectionId },
      pokemonCard: card,
      variant: "normal",
      language: "fr",
      quantity: 1,
      quantityAvailable: 1,
      provenance: { operationId: "legacy-op", source: "csv_import" },
    } as unknown as CollectionItem);

    const migration = new CollectionBulkOperations1789100000000();
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      expect(
        await runner.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_bulk_operation'`,
        ),
      ).toHaveLength(0);

      await migration.up(runner);
      const adopted = await runner.query(
        `SELECT "status" FROM "collection_bulk_operation" WHERE "operationId" = 'legacy-op'`,
      );
      // A legacy import cannot be compensated: it is recorded as already undone.
      expect(adopted).toHaveLength(1);
      expect(adopted[0].status).toBe("undone");
    } finally {
      await runner.release();
    }
  });
});
