import type { Request, Response } from "express";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { asyncHandler } from "../../lib/async-handler";
import { bedrockClient } from "../../aws/clients";
import { env } from "../../config/env";
import type { InterpretQueryInput } from "./matching.schemas";
import { matchingService } from "./matching.service";

export const matchingController = {
  interpret: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as InterpretQueryInput;
    const result = await matchingService.interpretQuery(
      input.query,
      env.BEDROCK_MODEL_ID,
      { converse: (converseInput) => bedrockClient.send(new ConverseCommand(converseInput)) },
    );
    res.status(200).json({ data: result });
  }),
};
