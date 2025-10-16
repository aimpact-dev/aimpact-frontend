import { useNavigate } from '@remix-run/react';
import GradientPage from './GradientPage';

export interface PolicySection {
  heading: string;
  content: Array<
    | { type: 'paragraph'; value: string }
    | { type: 'list'; value: string[] }
    | { type: 'contact'; value: { email?: string; website?: string } }
  >;
}
export interface PolicyData {
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: PolicySection[];
}

const policies = [
  {
    name: 'Terms of Service',
    url: '/terms-of-service',
  },
  {
    name: 'Privacy Policy',
    url: '/privacy-policy',
  },
  {
    name: 'Refund Policy',
    url: '/refund-policy',
  },
];

export default function PolicyPage({ policy }: { policy: PolicyData }) {
  const navigate = useNavigate();
  const otherPolicies = policies.filter((p) => p.name !== policy.title);

  return (
    <GradientPage>
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <h1 className="text-3xl text-center">{policy.title}</h1>

        <div className="flex flex-col gap-8 bg-black/15 rounded-xl p-8">
          {policy.intro && <p className="indent-5">{policy.intro}</p>}

          {policy.sections.map((section, i) => (
            <section key={i}>
              {section.heading && (
                <h2>
                  <strong>{section.heading}</strong>
                </h2>
              )}
              {section.content.map((contentItem, j) => {
                switch (contentItem.type) {
                  case 'paragraph':
                    return <p key={j}>{contentItem.value}</p>;

                  case 'list':
                    return (
                      <ul key={j} className="list-disc mx-10 my-3">
                        {contentItem.value.map((item, k) => (
                          <li key={k}>{item}</li>
                        ))}
                      </ul>
                    );

                  case 'contact':
                    return (
                      <div key={j} className="contact-info">
                        {contentItem.value.email && (
                          <p>
                            Email: <a href={`mailto:${contentItem.value.email}`}>{contentItem.value.email}</a>
                          </p>
                        )}
                        {contentItem.value.website && (
                          <p>
                            Website:{' '}
                            <a href={contentItem.value.website} target="_blank" rel="noopener noreferrer">
                              {contentItem.value.website}
                            </a>
                          </p>
                        )}
                      </div>
                    );

                  default:
                    return null;
                }
              })}
            </section>
          ))}
        </div>

        <p className="text-right text-white/80">
          <strong>Last updated:</strong> {policy.lastUpdated}
        </p>

        <div className="mx-auto flex gap-5 text-white/80 ">
          {otherPolicies.map((p) => (
            <button onClick={() => navigate(p.url)} className="hover:text-white transition-all">
              {p.name}{' '}
            </button>
          ))}
        </div>
      </div>
    </GradientPage>
  );
}
