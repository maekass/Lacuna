import type { Meta, StoryObj } from "@storybook/react";
import Providers from "@/components/Providers";
import {
  LacunaTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

const meta: Meta<typeof LacunaTooltip> = {
  title: "Lacuna/UI/Tooltip",
  component: LacunaTooltip,
  decorators: [
    (Story) => (
      <Providers>
        <div className="flex min-h-[200px] items-center justify-center p-8">
          <Story />
        </div>
      </Providers>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LacunaTooltip>;

export const Default: Story = {
  args: {
    content: "Verified deal count from public filings.",
    children: (
      <button
        type="button"
        className="rounded-lg border border-lacuna-border bg-lacuna-surface px-4 py-2 text-sm text-lacuna-text-primary"
      >
        Hover me
      </button>
    ),
  },
};

export const LongContent: Story = {
  render: () => (
    <LacunaTooltip
      content="This tooltip wraps longer provenance copy so reviewers can see how inverse-surface panels behave with multi-line educational disclaimers."
      side="bottom"
    >
      <button
        type="button"
        className="rounded-lg border border-lacuna-border bg-lacuna-surface px-4 py-2 text-sm text-lacuna-text-primary"
      >
        Long tooltip
      </button>
    </LacunaTooltip>
  ),
};

export const DisabledTrigger: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild disabled>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-muted px-4 py-2 text-sm text-lacuna-text-muted"
        >
          Disabled (no hover)
        </button>
      </TooltipTrigger>
      <TooltipContent>Should not appear</TooltipContent>
    </Tooltip>
  ),
};

export const EdgeAligned: Story = {
  render: () => (
    <div className="flex w-full max-w-md justify-end">
      <LacunaTooltip
        content="Right-aligned trigger — tooltip should flip/clamp near viewport edge."
        side="left"
      >
        <button
          type="button"
          className="rounded-lg border border-lacuna-border bg-lacuna-surface px-4 py-2 text-sm text-lacuna-text-primary"
        >
          Near edge
        </button>
      </LacunaTooltip>
    </div>
  ),
};
