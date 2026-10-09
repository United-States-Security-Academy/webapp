import { listAllCoursesForDiscountPicker, listDiscountCodesWithUsage } from '@/features/discounts/discount-queries';
import { CreateDiscountCodeForm } from '@/features/discounts/create-discount-code-form';
import { DiscountCodeRowActions } from '@/features/discounts/discount-code-row-actions';
import { Badge } from '@/components/ui/badge';

function describeStatus(isActive: boolean, expiresAt: Date | null): string {
  if (!isActive) return 'off';
  if (expiresAt && expiresAt.getTime() < Date.now()) return 'expired';
  return 'active';
}

export default async function AdminDiscountsPage() {
  const [discountCodeRows, courseOptions] = await Promise.all([
    listDiscountCodesWithUsage(),
    listAllCoursesForDiscountPicker(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-extrabold text-navy-900">Discount Codes</h1>
      <p className="mt-1 text-sm text-slate-500">Create a code that takes a percentage off a course&apos;s price at checkout.</p>

      <div className="mt-6">
        <CreateDiscountCodeForm courseOptions={courseOptions} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Off</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {discountCodeRows.map(({ discountCode, courseTitle, redemptionCount }) => (
              <tr key={discountCode.id} className="border-b border-slate-50 align-top last:border-0">
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">{discountCode.code}</td>
                <td className="px-4 py-3 text-slate-700">{discountCode.percentOff}%</td>
                <td className="px-4 py-3 text-slate-600">{courseTitle ?? 'All courses'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {discountCode.allowedEmails.length === 0 ? (
                    'Anyone'
                  ) : (
                    <span title={discountCode.allowedEmails.join('\n')}>
                      {discountCode.allowedEmails.length === 1
                        ? discountCode.allowedEmails[0]
                        : `${discountCode.allowedEmails.length} users`}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {redemptionCount}
                  {discountCode.maxRedemptions !== null && ` / ${discountCode.maxRedemptions}`}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {discountCode.expiresAt
                    ? discountCode.expiresAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })
                    : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <Badge>{describeStatus(discountCode.isActive, discountCode.expiresAt)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <DiscountCodeRowActions
                    discountCodeId={discountCode.id}
                    code={discountCode.code}
                    isActive={discountCode.isActive}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {discountCodeRows.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No discount codes yet.</p>}
      </div>
    </main>
  );
}
