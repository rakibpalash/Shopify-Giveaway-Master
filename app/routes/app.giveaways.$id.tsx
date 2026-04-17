import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useFetcher,
  Form,
  useNavigation,
} from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Banner,
  IndexTable,
  Divider,
  Grid,
  Box,
  Modal,
  List,
} from "@shopify/polaris";
import { GiveawayForm, type GiveawayFormFields, type GiveawayFormErrors } from "../components/GiveawayForm";
import { GiveawayStatusBadge } from "../components/GiveawayStatusBadge";
import { authenticate } from "../shopify.server";
import {
  getGiveaway,
  updateGiveaway,
  deleteGiveaway,
  pickWinner,
  getWinnerEntry,
} from "../models/giveaway.server";
import { getEntriesByGiveaway, exportEntriesCSV } from "../models/entry.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1);

  const giveaway = await getGiveaway(id!, session.shop);
  if (!giveaway) throw new Response("Not Found", { status: 404 });

  const [entriesData, winnerEntry] = await Promise.all([
    getEntriesByGiveaway(id!, page),
    getWinnerEntry(giveaway),
  ]);

  return json({ giveaway, entriesData, winnerEntry });
};

function validateForm(data: GiveawayFormFields): GiveawayFormErrors {
  const errors: GiveawayFormErrors = {};
  if (!data.title.trim()) errors.title = "Title is required";
  if (!data.prize.trim()) errors.prize = "Prize description is required";
  if (!data.startDate) errors.startDate = "Start date is required";
  if (!data.endDate) errors.endDate = "End date is required";
  if (data.startDate && data.endDate && data.startDate >= data.endDate) {
    errors.endDate = "End date must be after start date";
  }
  return errors;
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "save": {
      const fields: GiveawayFormFields = {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        prize: String(formData.get("prize") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        status: String(formData.get("status") ?? "draft"),
      };
      const errors = validateForm(fields);
      if (Object.keys(errors).length > 0) {
        return json({ errors, fields }, { status: 422 });
      }
      await updateGiveaway(id!, session.shop, {
        title: fields.title.trim(),
        description: fields.description.trim() || undefined,
        prize: fields.prize.trim(),
        startDate: new Date(fields.startDate),
        endDate: new Date(fields.endDate),
        status: fields.status as "draft" | "active" | "ended" | "cancelled",
      });
      return json({ saved: true });
    }

    case "pick-winner": {
      try {
        await pickWinner(id!, session.shop);
      } catch (err: any) {
        return json({ winnerError: err.message }, { status: 400 });
      }
      return json({ winnerPicked: true });
    }

    case "delete": {
      await deleteGiveaway(id!, session.shop);
      return redirect("/app/giveaways");
    }

    case "export-csv": {
      const csv = await exportEntriesCSV(id!);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="entries-${id}.csv"`,
        },
      });
    }

    default:
      return json({ error: "Unknown action" }, { status: 400 });
  }
};

export default function GiveawayDetail() {
  const { giveaway, entriesData, winnerEntry } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isSubmitting = navigation.state === "submitting";

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [fields, setFields] = useState<GiveawayFormFields>({
    title: giveaway.title,
    description: giveaway.description ?? "",
    prize: giveaway.prize,
    startDate: new Date(giveaway.startDate).toISOString().split("T")[0],
    endDate: new Date(giveaway.endDate).toISOString().split("T")[0],
    status: giveaway.status,
  });

  const handleChange = useCallback(
    (field: keyof GiveawayFormFields, value: string) => {
      setFields((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const submitAction = (intent: string) => {
    const fd = new FormData();
    fd.append("intent", intent);
    fetcher.submit(fd, { method: "POST" });
  };

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(giveaway.endDate).getTime() - Date.now()) / 86400000),
  );

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.SHOPIFY_APP_URL ?? "";
  const entryPageUrl = `${appUrl}/enter/${giveaway.id}`;

  const rowMarkup = entriesData.entries.map((entry, index) => (
    <IndexTable.Row id={entry.id} key={entry.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {entry.customerName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {entry.customerEmail}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge>{entry.entryMethod}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {new Date(entry.createdAt).toLocaleDateString()}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title={giveaway.title}
      backAction={{ content: "Giveaways", url: "/app/giveaways" }}
      titleMetadata={<GiveawayStatusBadge status={giveaway.status} />}
      secondaryActions={[
        {
          content: "Delete",
          destructive: true,
          onAction: () => setShowDeleteModal(true),
        },
      ]}
    >
      <ui-title-bar title={giveaway.title}>
        <button variant="breadcrumb" onClick={() => (window.location.href = "/app/giveaways")}>
          Giveaways
        </button>
      </ui-title-bar>

      <Layout>
        {/* Winner banner */}
        {winnerEntry && (
          <Layout.Section>
            <Banner tone="success" title="Winner Selected!">
              <p>
                <strong>{winnerEntry.customerName}</strong> (
                {winnerEntry.customerEmail}) won this giveaway.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {/* Save success */}
        {(actionData as any)?.saved && (
          <Layout.Section>
            <Banner tone="success" title="Giveaway saved successfully!" />
          </Layout.Section>
        )}

        {/* Winner error */}
        {(actionData as any)?.winnerError && (
          <Layout.Section>
            <Banner tone="critical" title={(actionData as any).winnerError} />
          </Layout.Section>
        )}

        {/* Stats */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <Card>
                <BlockStack gap="100">
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Total Entries
                  </Text>
                  <Text variant="heading2xl" as="p" fontWeight="bold">
                    {giveaway._count.entries.toLocaleString()}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <Card>
                <BlockStack gap="100">
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Days Remaining
                  </Text>
                  <Text variant="heading2xl" as="p" fontWeight="bold">
                    {giveaway.status === "active" ? daysLeft : "—"}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <Card>
                <BlockStack gap="100">
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Winner
                  </Text>
                  <Text variant="heading2xl" as="p" fontWeight="bold">
                    {winnerEntry ? "Selected" : "—"}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Edit form */}
        <Layout.Section>
          <Form method="post">
            <input type="hidden" name="intent" value="save" />
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Giveaway Details
                </Text>
                <Divider />
                <GiveawayForm
                  fields={fields}
                  errors={(actionData as any)?.errors}
                  onChange={handleChange}
                />
                <InlineStack gap="300" align="end">
                  <Button
                    variant="primary"
                    submit
                    loading={isSubmitting && navigation.formData?.get("intent") === "save"}
                  >
                    Save Changes
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Form>
        </Layout.Section>

        {/* Entry links */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Entry Links
              </Text>
              <Divider />
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  Hosted Entry Page
                </Text>
                <Text variant="bodyMd" as="p" breakWord>
                  <a href={entryPageUrl} target="_blank" rel="noreferrer">
                    {entryPageUrl}
                  </a>
                </Text>
                <Text variant="bodySm" tone="subdued" as="p">
                  Share this link with customers or add it to your store's navigation.
                </Text>
              </BlockStack>
              <Divider />
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  Theme Widget — Giveaway ID
                </Text>
                <Text variant="bodyMd" as="p" breakWord>
                  <code>{giveaway.id}</code>
                </Text>
                <Text variant="bodySm" tone="subdued" as="p">
                  Paste this ID into the Giveaway Widget block settings in your theme editor.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Pick winner + actions */}
        {giveaway.status === "active" && !giveaway.winnerId && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Winner Selection
                </Text>
                <Divider />
                <Text variant="bodyMd" as="p">
                  Randomly select a winner from all {giveaway._count.entries}{" "}
                  {giveaway._count.entries === 1 ? "entry" : "entries"}. The
                  giveaway status will be set to <strong>Ended</strong>.
                </Text>
                <InlineStack>
                  <Button
                    variant="primary"
                    tone="success"
                    disabled={giveaway._count.entries === 0}
                    onClick={() => setShowWinnerModal(true)}
                  >
                    Pick Winner Randomly
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Entries table */}
        <Layout.Section>
          <Card padding="0">
            <Box padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">
                  Entries ({giveaway._count.entries.toLocaleString()})
                </Text>
                {giveaway._count.entries > 0 && (
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="export-csv" />
                    <Button variant="plain" submit size="slim">
                      Export CSV
                    </Button>
                  </fetcher.Form>
                )}
              </InlineStack>
            </Box>
            <Divider />

            {entriesData.entries.length === 0 ? (
              <Box padding="800">
                <BlockStack gap="300" inlineAlign="center">
                  <Text variant="bodyMd" tone="subdued" as="p">
                    No entries yet. Share the entry link to start collecting entries.
                  </Text>
                </BlockStack>
              </Box>
            ) : (
              <>
                <IndexTable
                  resourceName={{ singular: "entry", plural: "entries" }}
                  itemCount={entriesData.entries.length}
                  headings={[
                    { title: "Name" },
                    { title: "Email" },
                    { title: "Method" },
                    { title: "Date" },
                  ]}
                  selectable={false}
                >
                  {rowMarkup}
                </IndexTable>
                {entriesData.pageCount > 1 && (
                  <Box padding="400">
                    <InlineStack gap="300" align="center">
                      {entriesData.page > 1 && (
                        <Button
                          url={`/app/giveaways/${giveaway.id}?page=${entriesData.page - 1}`}
                          variant="plain"
                        >
                          Previous
                        </Button>
                      )}
                      <Text variant="bodyMd" as="span" tone="subdued">
                        Page {entriesData.page} of {entriesData.pageCount}
                      </Text>
                      {entriesData.page < entriesData.pageCount && (
                        <Button
                          url={`/app/giveaways/${giveaway.id}?page=${entriesData.page + 1}`}
                          variant="plain"
                        >
                          Next
                        </Button>
                      )}
                    </InlineStack>
                  </Box>
                )}
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      {/* Pick Winner Modal */}
      <Modal
        open={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        title="Pick a Random Winner"
        primaryAction={{
          content: "Pick Winner",
          onAction: () => {
            setShowWinnerModal(false);
            submitAction("pick-winner");
          },
          destructive: false,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowWinnerModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text variant="bodyMd" as="p">
              A winner will be randomly selected from all{" "}
              <strong>{giveaway._count.entries}</strong>{" "}
              {giveaway._count.entries === 1 ? "entry" : "entries"}.
            </Text>
            <List type="bullet">
              <List.Item>
                The giveaway status will change to <strong>Ended</strong>
              </List.Item>
              <List.Item>This action cannot be undone</List.Item>
              <List.Item>
                The winner's details will appear on this page
              </List.Item>
            </List>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Giveaway"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: () => {
            setShowDeleteModal(false);
            submitAction("delete");
          },
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowDeleteModal(false),
          },
        ]}
      >
        <Modal.Section>
          <Text variant="bodyMd" as="p">
            Are you sure you want to delete <strong>{giveaway.title}</strong>?
            All {giveaway._count.entries} entries will also be deleted. This
            cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
