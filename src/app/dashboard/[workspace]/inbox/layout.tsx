import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inbox',
  description: 'View and manage all your notifications and team activity.',
};

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
