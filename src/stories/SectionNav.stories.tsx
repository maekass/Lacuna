import type { Meta, StoryObj } from "@storybook/react";
import SectionNav from "@/components/layout/SectionNav";
import { WORKSPACES } from "@/lib/navigation/workspaces";

const dealsSections = WORKSPACES.find((w) => w.slug === "deals")?.sections ??
  [];

const meta: Meta<typeof SectionNav> = {
  title: "Lacuna/Navigation/SectionNav",
  component: SectionNav,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SectionNav>;

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  args: { sections: dealsSections },
};

export const Tablet: Story = {
  parameters: {
    viewport: { defaultViewport: "tablet" },
  },
  args: { sections: dealsSections },
};

export const Desktop: Story = {
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  args: { sections: dealsSections },
};
