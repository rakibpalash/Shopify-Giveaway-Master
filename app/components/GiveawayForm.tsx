import {
  FormLayout,
  TextField,
  Select,
  BlockStack,
  Text,
  InlineStack,
  Box,
} from "@shopify/polaris";

export interface GiveawayFormFields {
  title: string;
  description: string;
  prize: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface GiveawayFormErrors {
  title?: string;
  prize?: string;
  startDate?: string;
  endDate?: string;
}

interface Props {
  fields: GiveawayFormFields;
  errors?: GiveawayFormErrors;
  onChange: (field: keyof GiveawayFormFields, value: string) => void;
}

const statusOptions = [
  { label: "Draft (not visible to customers)", value: "draft" },
  { label: "Active (accepting entries)", value: "active" },
];

export function GiveawayForm({ fields, errors = {}, onChange }: Props) {
  return (
    <FormLayout>
      <TextField
        label="Giveaway Title"
        name="title"
        value={fields.title}
        onChange={(v) => onChange("title", v)}
        error={errors.title}
        autoComplete="off"
        placeholder="e.g. Summer Giveaway 2025"
        requiredIndicator
      />

      <TextField
        label="Description"
        name="description"
        value={fields.description}
        onChange={(v) => onChange("description", v)}
        multiline={4}
        autoComplete="off"
        placeholder="Tell customers what this giveaway is about..."
        helpText="Optional. Shown on the entry page."
      />

      <TextField
        label="Prize"
        name="prize"
        value={fields.prize}
        onChange={(v) => onChange("prize", v)}
        error={errors.prize}
        autoComplete="off"
        placeholder="e.g. $500 Gift Card + Free Shipping for a Year"
        requiredIndicator
        helpText="Describe exactly what the winner will receive."
      />

      <InlineStack gap="400" wrap>
        <Box minWidth="200px">
          <TextField
            label="Start Date"
            name="startDate"
            type="date"
            value={fields.startDate}
            onChange={(v) => onChange("startDate", v)}
            error={errors.startDate}
            autoComplete="off"
            requiredIndicator
          />
        </Box>
        <Box minWidth="200px">
          <TextField
            label="End Date"
            name="endDate"
            type="date"
            value={fields.endDate}
            onChange={(v) => onChange("endDate", v)}
            error={errors.endDate}
            autoComplete="off"
            requiredIndicator
          />
        </Box>
      </InlineStack>

      <Select
        label="Status"
        name="status"
        options={statusOptions}
        value={fields.status}
        onChange={(v) => onChange("status", v)}
        helpText="Set to Active when you're ready for customers to enter."
      />

      <BlockStack gap="100">
        <Text variant="bodySm" tone="subdued" as="p">
          Entry Method: Name + Email (one entry per email address)
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          Winners are selected randomly. You can pick the winner from the giveaway detail page.
        </Text>
      </BlockStack>
    </FormLayout>
  );
}
