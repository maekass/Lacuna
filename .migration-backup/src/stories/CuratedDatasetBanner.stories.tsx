import type { Meta, StoryObj } from "@storybook/react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { ProvenanceProvider } from "@/lib/provenance/ProvenanceContext";
import { VerifiedDatasetProvider } from "@/lib/data/VerifiedDatasetContext";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

const dataset = getStaticVerifiedDataset();

const meta: Meta<typeof CuratedDatasetBanner> = {
  title: "Lacuna/CuratedDatasetBanner",
  component: CuratedDatasetBanner,
  decorators: [
    (Story) => (
      <VerifiedDatasetProvider dataset={dataset}>
        <ProvenanceProvider globalBarActive={false}>
          <div className="max-w-xl p-4">
            <Story />
          </div>
        </ProvenanceProvider>
      </VerifiedDatasetProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CuratedDatasetBanner>;

export const PanelBanner: Story = {};

export const ForcedVisibleWithGlobalBar: Story = {
  decorators: [
    (Story) => (
      <VerifiedDatasetProvider dataset={dataset}>
        <ProvenanceProvider globalBarActive>
          <div className="max-w-xl p-4">
            <Story />
          </div>
        </ProvenanceProvider>
      </VerifiedDatasetProvider>
    ),
  ],
  args: { forceShow: true },
};
