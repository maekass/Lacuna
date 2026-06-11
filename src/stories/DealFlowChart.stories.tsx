import type { Meta, StoryObj } from "@storybook/react";
import DealFlowChart from "@/components/DealFlowChart";
import { getVerifiedDealsByYear } from "@/data/verifiedData";

const fullData = getVerifiedDealsByYear();

const meta: Meta<typeof DealFlowChart> = {
  title: "Lacuna/Charts/DealFlowChart",
  component: DealFlowChart,
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof DealFlowChart>;

export const Default: Story = {
  args: { data: fullData },
};

export const EmptyDataset: Story = {
  args: { data: [] },
};

export const SingleYear: Story = {
  args: {
    data: [{ year: 2024, count: 3 }],
  },
};

/** Sparse sample (N &lt; 10 years) — descriptive momentum may be unstable. */
export const SparseUnderTenYears: Story = {
  args: {
    data: [
      { year: 2020, count: 2 },
      { year: 2021, count: 1 },
      { year: 2022, count: 4 },
    ],
  },
};

/** Zero-count years mimic undisclosed / quiet periods in the verified set. */
export const UndisclosedQuietYears: Story = {
  args: {
    data: [
      { year: 2018, count: 5 },
      { year: 2019, count: 0 },
      { year: 2020, count: 0 },
      { year: 2021, count: 2 },
      { year: 2022, count: 8 },
    ],
  },
};
