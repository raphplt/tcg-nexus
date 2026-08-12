import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";

import { AllExceptionsFilter } from "./http-exception.filter";

const createHost = (url = "/test") => {
  const response: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request: any = { url };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as ArgumentsHost;
  return { host, response, request };
};

describe("AllExceptionsFilter", () => {
  it("should use default message for bad request when empty", () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();
    const exception = new HttpException({}, HttpStatus.BAD_REQUEST);
    filter.catch(exception, host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Requête invalide." }),
    );
  });

  it("should handle generic error with internal fallback", () => {
    const { host, response } = createHost("/internal");
    const filter = new AllExceptionsFilter();
    filter.catch(new Error("boom"), host);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "boom",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: "/internal",
      }),
    );
  });
});

describe("AllExceptionsFilter — contrat de code", () => {
  it("expose le code métier porté par l'exception", () => {
    const { host, response } = createHost("/players/42");
    const filter = new AllExceptionsFilter();
    filter.catch(
      new HttpException(
        { code: "PLAYER_NOT_FOUND", message: "Joueur non trouvé" },
        HttpStatus.NOT_FOUND,
      ),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "PLAYER_NOT_FOUND",
        statusCode: HttpStatus.NOT_FOUND,
        message: "Joueur non trouvé",
      }),
    );
  });

  it("retombe sur un code générique selon le statut", () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();
    filter.catch(new HttpException({}, HttpStatus.FORBIDDEN), host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("regroupe les erreurs de validation sous VALIDATION_ERROR", () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();
    filter.catch(
      new HttpException(
        { message: ["email must be an email"] },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        fields: { messages: ["email must be an email"] },
      }),
    );
  });

  it("masque le message technique d'une erreur interne en production", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const { host, response } = createHost();
    new AllExceptionsFilter().catch(new Error("stack trace secrète"), host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Une erreur interne est survenue." }),
    );
    process.env.NODE_ENV = previous;
  });
});
