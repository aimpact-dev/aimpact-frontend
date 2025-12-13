import { classNames } from '~/utils/classNames';
import { Badge, Card, type BadgeVariant } from '../ui';

export interface WhatsNewPost {
  type: WhatsNewPostType;
  name: string;
  text: string;
  date: Date;
}

export type WhatsNewPostType = 'Feature' | 'Integration' | 'Improvement' | 'Fix' | 'Announcement' | 'Deprecation';

export const whatsNewPostTypeIcons: Record<WhatsNewPostType, string> = {
  Feature: 'i-ph:star-four-bold',
  Integration: 'i-ph:plug-bold',
  Improvement: 'i-ph:arrow-bend-up-right-bold',
  Fix: 'i-ph:wrench-bold',
  Announcement: 'i-ph:megaphone-bold',
  Deprecation: 'i-ph:warning-bold',
};

export const whatsNewPostTypeBadgeVariants: Record<WhatsNewPostType, BadgeVariant> = {
  Feature: 'info',
  Integration: 'primary',
  Improvement: 'success',
  Fix: 'warning',
  Announcement: 'primary',
  Deprecation: 'danger',
};

interface Props {
  posts: WhatsNewPost[];
}

export default function WhatsNew({ posts }: Props) {
  return (
    <>
      <div className="flex flex-col gap-5">
        {posts.map((post) => {
          return (
            <Card variant="accented" key={post.date.getTime()}>
              <div className="flex flex-col gap-2 border-b border-border-light p-4">
                <div className="flex justify-between items-center">
                  <Badge variant={whatsNewPostTypeBadgeVariants[post.type]}>{post.type}</Badge>
                  <span className="text-sm text-bolt-elements-textSecondary">
                    {post.date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={classNames('inline-block text-accent-500', whatsNewPostTypeIcons[post.type])}></div>
                  <h2 className="text-xl font-bold">{post.name}</h2>
                </div>
              </div>

              <p className="text-left p-4">{post.text}</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
