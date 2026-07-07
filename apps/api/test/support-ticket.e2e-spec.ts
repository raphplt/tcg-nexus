import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { MailService } from "./../src/mail/mail.service";
import { SupportTicketStatusType } from "./../src/common/enums/supportTicketType";
import { createUser } from "./helpers/auth";
import { createE2eApp } from "./helpers/app";

const mailServiceMock = {
  sendTicketCreated: jest.fn(),
  sendTicketReply: jest.fn(),
};

jest.setTimeout(60000);

describe("SupportTicketController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    ({ app } = await createE2eApp({
      providerOverrides: [{ provide: MailService, useValue: mailServiceMock }],
    }));
    httpServer = app.getHttpServer() as Server;
  }, 60000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a ticket, lists it, adds messages, and closes it for the owner", async () => {
    const owner = await createUser(httpServer);

    const createResponse = await request(httpServer)
      .post("/support/tickets")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        subject: "E2E ticket subject",
        message: "Initial support ticket message",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toEqual(expect.any(Number));
    expect(createResponse.body.subject).toBe("E2E ticket subject");
    expect(createResponse.body.status).toBe(SupportTicketStatusType.opened);
    expect(mailServiceMock.sendTicketCreated).toHaveBeenCalledWith(
      owner.email,
      createResponse.body.id,
      "E2E ticket subject",
    );

    const ticketId = createResponse.body.id;

    const listResponse = await request(httpServer)
      .get("/support/tickets")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .query({ page: 1, limit: 10 });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ticketId })]),
    );
    expect(listResponse.body.meta.total).toBeGreaterThanOrEqual(1);

    const replyResponse = await request(httpServer)
      .post(`/support/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ message: "Owner follow-up message" });
    expect(replyResponse.status).toBe(201);
    expect(replyResponse.body.message).toBe("Owner follow-up message");
    expect(replyResponse.body.isStaff).toBe(false);

    const messagesResponse = await request(httpServer)
      .get(`/support/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .query({ page: 1, limit: 10 });
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Initial support ticket message" }),
        expect.objectContaining({ message: "Owner follow-up message" }),
      ]),
    );

    const closeResponse = await request(httpServer)
      .patch(`/support/tickets/${ticketId}/close`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(closeResponse.status).toBe(200);
    expect(closeResponse.body.status).toBe(SupportTicketStatusType.closed);

    await request(httpServer)
      .post(`/support/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ message: "Message after close" })
      .expect(403);
  });

  it("prevents other users from reading or replying to a ticket", async () => {
    const owner = await createUser(httpServer);
    const other = await createUser(httpServer);

    const createResponse = await request(httpServer)
      .post("/support/tickets")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        subject: "Private ticket",
        message: "Only the owner should access this ticket",
      })
      .expect(201);

    const ticketId = createResponse.body.id;

    await request(httpServer)
      .get(`/support/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .expect(403);

    await request(httpServer)
      .post(`/support/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ message: "Unauthorized reply" })
      .expect(403);
  });

  it("rejects support ticket endpoints without authentication", async () => {
    await request(httpServer)
      .post("/support/tickets")
      .send({
        subject: "Anonymous",
        message: "Anonymous support message",
      })
      .expect(401);

    await request(httpServer).get("/support/tickets").expect(401);
  });
});
