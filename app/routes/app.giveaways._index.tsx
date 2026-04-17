import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Button,
  InlineStack,
  Badge,
  EmptyState,
  Tabs,
  useIndexResourceState,
  BlockStack,
  Divider,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { GiveawayStatusBadge } from "../components/GiveawayStatusBadge";
import { authenticate } from "../shopify.server";
import {
  getGiveaways,
  deleteGiveaway,
  updateGiveaway,
  type GiveawayStatus,
} from "../models/giveaway.server";

const STATUS_TABS = [
  { id: "all", content: "All", value: undefined },
  { id: "active", content: "Active", value: "active" as GiveawayStatus },
  { id: "draft", content: "Draft", value: "draft" as GiveawayStatus },
  { id: "ended", content: "Ended", value: "ended" as GiveawayStatus },
  { id: "cancelled", content: "Cancelled", value: "cancelled" as GiveawayStatus },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") as GiveawayStatus | null;
  const giveaways = await getGiveaways(session.shop, statusFilter ?? undefined);
  return json({ giveaways, statusFilter });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const id = formData.get("id") as string;

  switch (intent) {
    case "delete":
      await deleteGiveaway(id, session.shop);
      break;
    case "activate":
      await updateGiveaway(id, session.shop, { status: "active" });
      break;
    case "deactivate":
      await updateGiveaway(id, session.shop, { status: "draft" });
      break;
    case "cancel":
      await updateGiveaway(id, session.shop, { status: "cancelled" });
      break;
  }

  return redirect("/app/giveaways");
};

export default function GiveawaysIndex() {
  const { giveaways, statusFilter } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const activeTabIndex = STATUS_TABS.findIndex(
    (t) => (t.value ?? null) === (statusFilter ?? null),
  );
  const [selectedTab, setSelectedTab] = useState(
    activeTabIndex >= 0 ? activeTabIndex : 0,
  );

  const handleTabChange = useCallback((selected: number) => {
    setSelectedTab(selected);
    const tab = STATUS_TABS[selected];
    const url = tab.value
      ? `/app/giveaways?status=${tab.value}`
      : "/app/giveaways";
    window.location.href = url;
  }, []);

  const resourceName = { singular: "giveaway", plural: "giveaways" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(giveaways);

  function submitAction(intent: string, id: string) {
    const formData = new FormData();
    formData.append("intent", intent);
    formData.append("id", id);
    fetcher.submit(formData, { method: "POST" });
  }

  const rowMarkup = giveaways.map((giveaway, index) => {
    const daysLeft = Math.ceil(
      (new Date(giveaway.endDate).getTime() - Date.now()) / 86400000,
    );

    return (
      <IndexTable.Row
        id={giveaway.id}
        key={giveaway.id}
        selected={selectedResources.includes(giveaway.id)}
        position={index}
      >
        <IndexTable.Cell>
          <BlockStack gap="050">
            <Text variant="bodyMd" fontWeight="semibold" as="span">
              {giveaway.title}
            </Text>
            <Text variant="bodySm" tone="subdued" as="span">
              {giveaway.prize}
            </Text>
          </BlockStack>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <GiveawayStatusBadge status={giveaway.status} />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {giveaway._count.entries.toLocaleString()}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {new Date(giveaway.endDate).toLocaleDateString()}
            {giveaway.status === "active" && daysLeft > 0 && (
              <Text variant="bodySm" tone="subdued" as="span">
                {" "}
                ({daysLeft}d left)
              </Text>
            )}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <InlineStack gap="200">
            <Button url={`/app/giveaways/${giveaway.id}`} variant="plain" size="slim">
              View
            </Button>
            {giveaway.status === "draft" && (
              <Button
                variant="plain"
                size="slim"
                tone="success"
                onClick={() => submitAction("activate", giveaway.id)}
              >
                Activate
              </Button>
            )}
            {giveaway.status === "active" && (
              <Button
                variant="plain"
                size="slim"
                onClick={() => submitAction("deactivate", giveaway.id)}
              >
                Deactivate
              </Button>
            )}
            <Button
              variant="plain"
              size="slim"
              tone="critical"
              onClick={() => {
                if (confirm(`Delete "${giveaway.title}"? This cannot be undone.`)) {
                  submitAction("delete", giveaway.id);
                }
              }}
            >
              Delete
            </Button>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="Giveaways"
      primaryAction={
        <Button url="/app/giveaways/new" variant="primary">
          Create Giveaway
        </Button>
      }
    >
      <ui-title-bar title="Giveaways">
        <button variant="primary" onClick={() => (window.location.href = "/app/giveaways/new")}>
          Create Giveaway
        </button>
      </ui-title-bar>

      <Layout>
        <Layout.Section>
          <Card padding="0">
            <Tabs
              tabs={STATUS_TABS}
              selected={selectedTab}
              onSelect={handleTabChange}
            />
            <Divider />
            {giveaways.length === 0 ? (
              <Box padding="800">
                <EmptyState
                  heading="No giveaways found"
                  action={{
                    content: "Create a giveaway",
                    url: "/app/giveaways/new",
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {selectedTab === 0
                      ? "Create your first giveaway to start collecting entries."
                      : `No giveaways with status "${STATUS_TABS[selectedTab].content}".`}
                  </p>
                </EmptyState>
              </Box>
            ) : (
              <IndexTable
                resourceName={resourceName}
                itemCount={giveaways.length}
                selectedItemsCount={
                  allResourcesSelected ? "All" : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: "Giveaway" },
                  { title: "Status" },
                  { title: "Entries" },
                  { title: "End Date" },
                  { title: "Actions" },
                ]}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
