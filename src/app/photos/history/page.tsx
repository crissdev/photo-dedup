import ActionHistory from '@/app/photos/components/action-history';

export const metadata = { title: 'Action History' };

export default function HistoryPage() {
  return (
    <div className="p-6">
      <ActionHistory />
    </div>
  );
}
