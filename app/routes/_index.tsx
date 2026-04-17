import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);

  const query = params.toString();
  return redirect(`/app${query ? `?${query}` : ""}`);
};
