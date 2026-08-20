import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPasswordStrengthLabel,
  validateForgotPasswordForm,
  validateLoginForm,
  validateRegisterForm,
} from "../utils/authValidation.js";

describe("Mobile AuthValidation", () => {
  describe("getPasswordStrengthLabel", () => {
    it("returns 'trop court' for short passwords", () => {
      assert.equal(getPasswordStrengthLabel("12345"), "trop court");
      assert.equal(getPasswordStrengthLabel(""), "trop court");
    });

    it("returns 'faible' for simple single-type passwords", () => {
      assert.equal(getPasswordStrengthLabel("abcdefgh"), "faible");
      assert.equal(getPasswordStrengthLabel("12345678"), "faible");
    });

    it("returns 'moyen' for passwords with 2 types", () => {
      assert.equal(getPasswordStrengthLabel("Abcdefgh"), "moyen");
      assert.equal(getPasswordStrengthLabel("abcdef12"), "moyen");
    });

    it("returns 'fort' for passwords with 3 or more types", () => {
      assert.equal(getPasswordStrengthLabel("Abcdef12!"), "fort");
    });
  });

  describe("validateLoginForm", () => {
    it("returns errors when fields are missing or invalid", () => {
      const errors = validateLoginForm({
        email: "invalid-email",
        password: "123",
      });
      assert.ok(errors.email);
      assert.ok(errors.password);
    });

    it("returns empty errors when login values are valid", () => {
      const errors = validateLoginForm({
        email: "user@example.com",
        password: "password123",
      });
      assert.equal(Object.keys(errors).length, 0);
    });
  });

  describe("validateForgotPasswordForm", () => {
    it("validates email presence and pattern", () => {
      assert.ok(validateForgotPasswordForm({ email: "" }).email);
      assert.ok(validateForgotPasswordForm({ email: "bad@" }).email);
      assert.equal(
        Object.keys(validateForgotPasswordForm({ email: "user@example.com" }))
          .length,
        0,
      );
    });
  });

  describe("validateRegisterForm", () => {
    it("detects mismatched passwords and weak passwords", () => {
      const errors = validateRegisterForm({
        pseudo: "valid_user",
        email: "user@test.com",
        password: "password",
        confirmPassword: "different-password",
      });

      assert.ok(errors.confirmPassword);
      assert.ok(errors.password);
    });

    it("validates valid registration inputs", () => {
      const errors = validateRegisterForm({
        pseudo: "trainer_ash",
        email: "ash@kanto.com",
        password: "Pikachu2026!",
        confirmPassword: "Pikachu2026!",
      });

      assert.equal(Object.keys(errors).length, 0);
    });
  });
});
