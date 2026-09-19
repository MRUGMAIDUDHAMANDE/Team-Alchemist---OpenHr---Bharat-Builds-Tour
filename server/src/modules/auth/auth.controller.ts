import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { authService } from "./auth.service";
import type {
  ConfirmSignupInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  ResetPasswordInput,
  SignupInput,
} from "./auth.schemas";

export const authController = {
  signup: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as SignupInput;
    const result = await authService.signup(input);
    res.status(201).json({
      data: {
        ...result,
        message: "Account created. Check your email for the verification code.",
      },
    });
  }),

  confirmSignup: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ConfirmSignupInput;
    const result = await authService.confirmSignup(input);
    res.status(200).json({
      data: { ...result, message: "Email verified. You can sign in now." },
    });
  }),

  resendCode: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    const result = await authService.resendConfirmationCode(email);
    res.status(200).json({
      data: { ...result, message: "A new verification code is on its way." },
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as LoginInput;
    const session = await authService.login(input);
    res.status(200).json({ data: session });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as RefreshInput;
    const tokens = await authService.refresh(input);
    res.status(200).json({ data: { tokens } });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const accessToken =
      req.auth?.userId && req.headers.authorization
        ? req.headers.authorization.slice(7).trim()
        : "";
    if (accessToken) {
      await authService.logout(accessToken);
    }
    res.status(200).json({ data: { message: "Signed out." } });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ForgotPasswordInput;
    const result = await authService.forgotPassword(input);
    res.status(200).json({
      data: {
        ...result,
        message: "If an account exists for that email, a reset code has been sent.",
      },
    });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ResetPasswordInput;
    const result = await authService.resetPassword(input);
    res.status(200).json({
      data: { ...result, message: "Password updated. Sign in with your new password." },
    });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) {
      throw AppError.unauthorized();
    }
    const user = await authService.getCurrentUser(req.auth.userId);
    res.status(200).json({ data: { user } });
  }),
};
