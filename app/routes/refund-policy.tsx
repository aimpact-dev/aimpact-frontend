import PolicyPage from '~/components/wrappers/PolicyPage';
import refundPolicyData from '~/data/refund-policy.json';
import type { PolicyData } from '~/components/wrappers/PolicyPage';

const refundPolicy = refundPolicyData as PolicyData;

export default function RefundPolicy() {
  return <PolicyPage policy={refundPolicy} />;
}
