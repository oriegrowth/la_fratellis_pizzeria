import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
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

  // Pizza routes
  pizzas: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllPizzas();
    }),
    getByCategory: publicProcedure
      .input(z.enum(['classica', 'especial', 'doce']))
      .query(async ({ input }) => {
        return await db.getPizzasByCategory(input);
      }),
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getPizzaById(input);
      }),
  }),

  products: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllProducts();
    }),
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getProductById(input);
      }),
  }),

  // Cart routes
  cart: router({
    getItems: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCartItems(input.sessionId);
      }),
    addItem: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        itemType: z.enum(['pizza', 'product']).default('pizza'),
        pizzaId1: z.number().optional(),
        pizzaId2: z.number().optional(),
        productId: z.number().optional(),
        size: z.enum(['small', 'large']).optional(),
        quantity: z.number().min(1),
        price: z.number().min(0),
      }).superRefine((input, ctx) => {
        if (input.itemType === 'pizza' && (!input.pizzaId1 || !input.size)) {
          ctx.addIssue({ code: 'custom', message: 'Pizza items require pizzaId1 and size' });
        }
        if (input.itemType === 'product' && !input.productId) {
          ctx.addIssue({ code: 'custom', message: 'Product items require productId' });
        }
      }))
      .mutation(async ({ input }) => {
        return await db.addToCart(input);
      }),
    removeItem: publicProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.removeFromCart(input);
      }),
    clear: publicProcedure
      .input(z.string())
      .mutation(async ({ input }) => {
        return await db.clearCart(input);
      }),
  }),

  // Customer routes
  customers: router({
    getByPhone: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getCustomerByPhone(input);
      }),
    createOrUpdate: publicProcedure
      .input(z.object({
        phone: z.string(),
        name: z.string(),
        address: z.string(),
        addressNumber: z.string(),
        addressReference: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createOrUpdateCustomer(input);
      }),
  }),

  // Order routes
  orders: router({
    create: publicProcedure
      .input(z.object({
        customerId: z.number().optional(),
        phone: z.string(),
        name: z.string(),
        address: z.string(),
        addressNumber: z.string(),
        addressReference: z.string().optional(),
        items: z.string(), // JSON string
        totalPrice: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        return await db.createOrder(input);
      }),
  }),

  // Promotions routes
  promotions: router({
    getActive: publicProcedure.query(async () => {
      return await db.getActivePromotions();
    }),
  }),
});

export type AppRouter = typeof appRouter;
