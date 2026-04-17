import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  Banner,
  Badge,
  InlineStack,
  Box,
  Divider,
} from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import prisma from "../db.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      prize: true,
      startDate: true,
      endDate: true,
      status: true,
      winnerId: true,
      _count: { select: { entries: true } },
    },
  });

  if (!giveaway) throw new Response("Not Found", { status: 404 });

  const isOpen =
    giveaway.status === "active" &&
    new Date() >= new Date(giveaway.startDate) &&
    new Date() <= new Date(giveaway.endDate);

  return json({ giveaway, isOpen });
};

function statusLabel(status: string) {
  switch (status) {
    case "active": return "Active";
    case "draft": return "Coming Soon";
    case "ended": return "Ended";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

export default function EntryPage() {
  const { giveaway, isOpen } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const isSubmitting = fetcher.state === "submitting";
  const hasSubmitted = fetcher.data?.success === true;
  const serverError = fetcher.data?.error;

  const validate = () => {
    let valid = true;
    if (!name.trim() || name.trim().length < 2) {
      setNameError("Please enter your full name (at least 2 characters)");
      valid = false;
    } else {
      setNameError("");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      valid = false;
    } else {
      setEmailError("");
    }
    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    fetcher.submit(
      JSON.stringify({
        giveawayId: giveaway.id,
        customerName: name.trim(),
        customerEmail: email.trim(),
        entryMethod: "form",
      }),
      {
        method: "POST",
        action: "/api/entries",
        encType: "application/json",
      },
    );
  };

  const endDate = new Date(giveaway.endDate);

  return (
    <AppProvider i18n={{}}>
      <div style={{ minHeight: "100vh", backgroundColor: "#f6f6f7" }}>
        <Box padding="600">
          <Page narrowWidth>
            <Layout>
              <Layout.Section>
                <Card>
                  <BlockStack gap="500">
                    {/* Header */}
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="start">
                        <Text variant="headingXl" as="h1">
                          {giveaway.title}
                        </Text>
                        <Badge
                          tone={
                            giveaway.status === "active"
                              ? "success"
                              : giveaway.status === "ended"
                              ? "info"
                              : "new"
                          }
                        >
                          {statusLabel(giveaway.status)}
                        </Badge>
                      </InlineStack>

                      {giveaway.description && (
                        <Text variant="bodyMd" as="p" tone="subdued">
                          {giveaway.description}
                        </Text>
                      )}
                    </BlockStack>

                    <Divider />

                    {/* Prize */}
                    <BlockStack gap="100">
                      <Text variant="headingMd" as="h2">
                        Prize
                      </Text>
                      <Text variant="bodyLg" as="p" fontWeight="semibold">
                        {giveaway.prize}
                      </Text>
                    </BlockStack>

                    {/* Stats */}
                    <InlineStack gap="600">
                      <BlockStack gap="050">
                        <Text variant="bodySm" tone="subdued" as="p">
                          Entries
                        </Text>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          {giveaway._count.entries.toLocaleString()}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="050">
                        <Text variant="bodySm" tone="subdued" as="p">
                          {giveaway.status === "ended" ? "Ended" : "Ends"}
                        </Text>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          {endDate.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </Text>
                      </BlockStack>
                    </InlineStack>

                    <Divider />

                    {/* Entry form or status message */}
                    {hasSubmitted ? (
                      <Banner tone="success" title="You're in!">
                        <p>
                          Your entry has been recorded. Good luck! We'll contact
                          you at <strong>{email}</strong> if you win.
                        </p>
                      </Banner>
                    ) : giveaway.status === "ended" ? (
                      <Banner tone="info" title="This giveaway has ended">
                        <p>The winner has been selected. Thank you to everyone who entered!</p>
                      </Banner>
                    ) : !isOpen ? (
                      <Banner tone="warning" title="Not accepting entries">
                        <p>
                          {giveaway.status === "draft"
                            ? "This giveaway hasn't started yet. Check back soon!"
                            : "This giveaway is no longer accepting entries."}
                        </p>
                      </Banner>
                    ) : (
                      <form onSubmit={handleSubmit}>
                        <BlockStack gap="400">
                          <Text variant="headingMd" as="h2">
                            Enter the Giveaway
                          </Text>

                          {serverError && (
                            <Banner tone="critical">{serverError}</Banner>
                          )}

                          <TextField
                            label="Your Name"
                            value={name}
                            onChange={setName}
                            error={nameError}
                            autoComplete="name"
                            placeholder="Jane Smith"
                          />
                          <TextField
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            error={emailError}
                            autoComplete="email"
                            placeholder="jane@example.com"
                            helpText="We'll only use this to contact you if you win."
                          />
                          <Button
                            variant="primary"
                            size="large"
                            fullWidth
                            loading={isSubmitting}
                            submit
                          >
                            Enter Now — It's Free!
                          </Button>
                          <Text variant="bodySm" tone="subdued" as="p" alignment="center">
                            One entry per email address. No purchase necessary.
                          </Text>
                        </BlockStack>
                      </form>
                    )}
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          </Page>
        </Box>
      </div>
    </AppProvider>
  );
}
