import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Grid,
  Text,
  Button,
  IndexTable,
  BlockStack,
  InlineStack,
  EmptyState,
  Box,
  Divider,
} from "@shopify/polaris";
import { GiveawayStatusBadge } from "../components/GiveawayStatusBadge";
import { authenticate } from "../shopify.server";
import { getDashboardStats, getGiveaways } from "../models/giveaway.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [stats, allGiveaways] = await Promise.all([
    getDashboardStats(session.shop),
    getGiveaways(session.shop),
  ]);
  const recentGiveaways = allGiveaways.slice(0, 5);
  return json({ stats, recentGiveaways });
};

interface StatCardProps {
  title: string;
  value: number;
  helpText?: string;
}

function StatCard({ title, value, helpText }: StatCardProps) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="bodyMd" tone="subdued" as="p">
          {title}
        </Text>
        <Text variant="heading2xl" as="p" fontWeight="bold">
          {value.toLocaleString()}
        </Text>
        {helpText && (
          <Text variant="bodySm" tone="subdued" as="p">
            {helpText}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

export default function Dashboard() {
  const { stats, recentGiveaways } = useLoaderData<typeof loader>();

  const rowMarkup = recentGiveaways.map((giveaway, index) => (
    <IndexTable.Row id={giveaway.id} key={giveaway.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          <Link to={`/app/giveaways/${giveaway.id}`}>{giveaway.title}</Link>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {giveaway.prize}
        </Text>
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
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Giveaway Dashboard"
      primaryAction={
        <Button url="/app/giveaways/new" variant="primary">
          Create Giveaway
        </Button>
      }
    >
      {/* App Bridge title bar for proper embedding */}
      <ui-title-bar title="Dashboard" />

      <Layout>
        {/* Stats row */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="Total Giveaways"
                value={stats.totalGiveaways}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="Active Giveaways"
                value={stats.activeGiveaways}
                helpText="Currently accepting entries"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="Total Entries"
                value={stats.totalEntries}
                helpText="Across all giveaways"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="Winners Announced"
                value={stats.winnersAnnounced}
              />
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Recent giveaways */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">
                  Recent Giveaways
                </Text>
                <Button url="/app/giveaways" variant="plain">
                  View all
                </Button>
              </InlineStack>
              <Divider />

              {recentGiveaways.length === 0 ? (
                <EmptyState
                  heading="No giveaways yet"
                  action={{
                    content: "Create your first giveaway",
                    url: "/app/giveaways/new",
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Start collecting entries and building excitement around your
                    products.
                  </p>
                </EmptyState>
              ) : (
                <IndexTable
                  resourceName={{
                    singular: "giveaway",
                    plural: "giveaways",
                  }}
                  itemCount={recentGiveaways.length}
                  headings={[
                    { title: "Title" },
                    { title: "Prize" },
                    { title: "Status" },
                    { title: "Entries" },
                    { title: "End Date" },
                  ]}
                  selectable={false}
                >
                  {rowMarkup}
                </IndexTable>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Quick links */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Quick Start
              </Text>
              <Divider />
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p">
                  1. Create a giveaway and set it to <strong>Active</strong>
                </Text>
                <Text variant="bodyMd" as="p">
                  2. Add the entry widget to your store theme or share the
                  hosted entry link
                </Text>
                <Text variant="bodyMd" as="p">
                  3. Pick a winner when the giveaway ends
                </Text>
              </BlockStack>
              <Box paddingBlockStart="200">
                <Button url="/app/giveaways/new" variant="primary" fullWidth>
                  Create Giveaway
                </Button>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
