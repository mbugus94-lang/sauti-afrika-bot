import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  processUserMessage,
  getConversationSummary,
} from "./chatbot";
import {
  loadConversationContext,
} from "./conversationContext";
import { getSupportedLanguages } from "./language";
import {
  createCombinedThrottleMiddleware,
} from "./throttlingMiddleware";

// Create throttled procedures
const throttledPublicProcedure = publicProcedure.use(
  createCombinedThrottleMiddleware(100, 1000)
);

const throttledProtectedProcedure = protectedProcedure.use(
  createCombinedThrottleMiddleware(100, 1000)
);

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chatbot: router({
    // Send a message and get a response
    sendMessage: throttledProtectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          message: z.string().min(1),
          userLanguage: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const response = await processUserMessage(
            input.conversationId,
            input.message,
            input.userLanguage
          );
          return response;
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to process message: ${error}`,
          });
        }
      }),

    // Get conversation summary
    getConversationSummary: throttledProtectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await getConversationSummary(input.conversationId);
        } catch (error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Conversation not found: ${error}`,
          });
        }
      }),

    // Get conversation history
    getConversationHistory: throttledProtectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        try {
          const context = await loadConversationContext(
            input.conversationId,
            input.limit
          );
          return context?.messageHistory || [];
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to load conversation history: ${error}`,
          });
        }
      }),

    // Get available languages
    getSupportedLanguages: throttledPublicProcedure.query(async () => {
      return getSupportedLanguages();
    }),
  }),
});

export type AppRouter = typeof appRouter;
