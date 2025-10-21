import PolicyPage from '~/components/wrappers/PolicyPage';
import termsOfServiceData from '~/data/terms-of-service.json';
import type { PolicyData } from '~/components/wrappers/PolicyPage';

const termsOfService = termsOfServiceData as PolicyData;

export default function TermsOfService() {
  return <PolicyPage policy={termsOfService} />;
}
