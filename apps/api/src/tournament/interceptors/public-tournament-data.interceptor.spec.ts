import { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { PublicTournamentDataInterceptor } from "./public-tournament-data.interceptor";

describe("PublicTournamentDataInterceptor", () => {
  const interceptor = new PublicTournamentDataInterceptor();
  const context = {} as ExecutionContext;

  it("removes private user and organizer fields recursively", async () => {
    const handler: CallHandler = {
      handle: () =>
        of({
          id: 1,
          players: [
            {
              id: 4,
              user: {
                id: 8,
                email: "private@example.com",
                firstName: "Ada",
                lastName: "Lovelace",
                role: "admin",
                preferredCurrency: "EUR",
                password: "secret",
              },
            },
          ],
          organizers: [
            {
              id: 3,
              name: "Tournament staff",
              role: "judge",
              email: "judge@example.com",
              phone: "0102030405",
            },
          ],
        }),
    };

    const result = (await firstValueFrom(
      interceptor.intercept(context, handler),
    )) as any;

    expect(result.players[0].user).toEqual({
      id: 8,
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(result.organizers[0]).toEqual({
      id: 3,
      name: "Tournament staff",
      role: "judge",
    });
  });
});
