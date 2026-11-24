import { NextRequest, NextResponse } from "next/server";

import {
  Agent,
  createAiProvider,
  createDatabaseAdapter,
  loadConfig,
} from "@negusdev/dbask";

// export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let database: ReturnType<typeof createDatabaseAdapter> | undefined;

  try {
    const body = await request.json();

    const question = body?.question;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 1000
    ) {
      return NextResponse.json(
        { error: "A valid question is required." },
        { status: 400 }
      );
    }

    const config = loadConfig();

    database = createDatabaseAdapter(config.database);

    const provider = createAiProvider(config.ai);

    const agent = new Agent(
      provider,
      {
        database,
        safety: config.safety,
      },
      {
        maxSteps: config.agent.maxSteps,
        responseMode: "natural",
      }
    );

    const result = await agent.ask(question.trim());

    return NextResponse.json({
      answer: result.text,
    });
  } catch (error) {
    console.error("DBAsk error:", error);

    return NextResponse.json(
      { error: "Unable to process your database question." },
      { status: 500 }
    );
  } finally {
    // await database?.close();
  }
}
