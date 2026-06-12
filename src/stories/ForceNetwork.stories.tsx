import type { Meta, StoryObj } from "@storybook/react";
import ForceNetwork from "@/components/ForceNetwork";
import { getVerifiedNetworkLinks, getVerifiedNetworkNodes } from "@/data/verifiedData";

const fullNodes = getVerifiedNetworkNodes();
const fullLinks = getVerifiedNetworkLinks();

const meta: Meta<typeof ForceNetwork> = {
  title: "Lacuna/Charts/ForceNetwork",
  component: ForceNetwork,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ForceNetwork>;

export const FullNetwork: Story = {
  args: {
    nodes: fullNodes,
    links: fullLinks,
    highlightPortfolios: true,
  },
};

export const EmptyGraph: Story = {
  args: {
    nodes: [],
    links: [],
    highlightPortfolios: false,
  },
};

export const SingleNode: Story = {
  args: {
    nodes: [fullNodes[0]],
    links: [],
    highlightPortfolios: false,
  },
};

/** Small subgraph (N &lt; 10 nodes) for layout stress-testing. */
export const SmallNetwork: Story = {
  args: {
    nodes: fullNodes.slice(0, 6),
    links: fullLinks.slice(0, 4),
    highlightPortfolios: true,
  },
};
