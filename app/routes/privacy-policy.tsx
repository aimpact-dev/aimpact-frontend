import PolicyPage from '~/components/wrappers/PolicyPage';
import privacyPolicyData from '~/data/privacy-policy.json';
import type { PolicyData } from '~/components/wrappers/PolicyPage';

const privacyPolicy = privacyPolicyData as PolicyData;

export default function PrivacyPolicy() {
  return <PolicyPage policy={privacyPolicy} />;
}
