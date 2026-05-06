import { PaymentType } from "@prisma/client";
import { created, errorResponse, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { checkoutSchema } from "@/lib/validation";
import { createCheckoutSession } from "@/server/modules/billing/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJson(request, checkoutSchema);
    return created(await createCheckoutSession({
      ...input,
      currency: input.currency ?? "usd",
      userId: user.id,
      type: PaymentType[input.type ?? "ONE_TIME"]
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
