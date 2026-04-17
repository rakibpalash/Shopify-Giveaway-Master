import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      // Clean up shop data on uninstall
      await prisma.session.deleteMany({ where: { shop } });
      break;
    default:
      console.log(`Unhandled webhook topic: ${topic} for ${shop}`);
  }

  return new Response();
};
