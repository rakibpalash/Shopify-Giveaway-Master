import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation, Form } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { GiveawayForm, type GiveawayFormFields, type GiveawayFormErrors } from "../components/GiveawayForm";
import { authenticate } from "../shopify.server";
import { createGiveaway } from "../models/giveaway.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

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

  const giveaway = await createGiveaway(session.shop, {
    title: fields.title.trim(),
    description: fields.description.trim() || undefined,
    prize: fields.prize.trim(),
    startDate: new Date(fields.startDate),
    endDate: new Date(fields.endDate),
    status: fields.status as "draft" | "active",
  });

  return redirect(`/app/giveaways/${giveaway.id}`);
};

const defaultFields: GiveawayFormFields = {
  title: "",
  description: "",
  prize: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  status: "draft",
};

export default function NewGiveaway() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [fields, setFields] = useState<GiveawayFormFields>(
    (actionData as any)?.fields ?? defaultFields,
  );

  const handleChange = useCallback(
    (field: keyof GiveawayFormFields, value: string) => {
      setFields((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return (
    <Page
      title="Create Giveaway"
      backAction={{ content: "Giveaways", url: "/app/giveaways" }}
    >
      <ui-title-bar title="Create Giveaway">
        <button variant="breadcrumb" onClick={() => (window.location.href = "/app/giveaways")}>
          Giveaways
        </button>
      </ui-title-bar>

      <Layout>
        <Layout.Section>
          <Form method="post">
            <BlockStack gap="500">
              {(actionData as any)?.errors &&
                Object.keys((actionData as any).errors).length > 0 && (
                  <Banner tone="critical" title="Please fix the errors below" />
                )}

              <Card>
                <GiveawayForm
                  fields={fields}
                  errors={(actionData as any)?.errors}
                  onChange={handleChange}
                />
              </Card>

              <InlineStack gap="300" align="end">
                <Button url="/app/giveaways" variant="plain">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  submit
                  loading={isSubmitting}
                >
                  Create Giveaway
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <p>
                <strong>Draft</strong> — The giveaway is saved but not visible
                to customers.
              </p>
              <p>
                <strong>Active</strong> — Customers can enter via the entry
                widget or hosted page.
              </p>
              <p>
                You can change the status at any time from the giveaway detail
                page.
              </p>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
