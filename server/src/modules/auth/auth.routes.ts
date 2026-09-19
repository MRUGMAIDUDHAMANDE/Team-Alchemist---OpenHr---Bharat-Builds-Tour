import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authRateLimiter } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import { authController } from "./auth.controller";
import {
  confirmSignupSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resendCodeSchema,
  resetPasswordSchema,
  signupSchema,
} from "./auth.schemas";

export const authRouter = Router();

authRouter.post("/signup", authRateLimiter, validate(signupSchema), authController.signup);
authRouter.post("/confirm", authRateLimiter, validate(confirmSignupSchema), authController.confirmSignup);
authRouter.post("/resend-code", authRateLimiter, validate(resendCodeSchema), authController.resendCode);
authRouter.post("/login", authRateLimiter, validate(loginSchema), authController.login);
authRouter.post("/refresh", validate(refreshSchema), authController.refresh);
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);
authRouter.post("/logout", authenticate, authController.logout);
authRouter.get("/me", authenticate, authController.me);
